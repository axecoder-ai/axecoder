import { runSubAgentTask } from '../agent/agent-subagent'
import { modelTaskKindForWorkshopRole, resolveModelIdForTask } from '../ai/model-resolve'
import { buildSubAgentToolList } from '../agent/agent-tool-registry'
import { roleDefById } from './workshop-roles'
import { buildWorkshopStreamId } from './workshop-stream'
import type { RoleSpeaker, RoleSpeakInput, RoleSpeakOutput } from './workshop-types'

const PATH_IN_TEXT =
  /(?:^|[\s'"`，。（(])(\.{0,2}\/?[\w@./-]+(?:\.[a-zA-Z0-9]{1,6})?|zhongzhi[\w/.-]*)/g

export const extractRelatedFiles = (text: string): string[] => {
  const found = new Set<string>()
  let m: RegExpExecArray | null
  const re = new RegExp(PATH_IN_TEXT.source, PATH_IN_TEXT.flags)
  while ((m = re.exec(text))) {
    const p = m[1]?.replace(/^@/, '').trim()
    if (!p || p.length < 2) continue
    if (/^(https?|npm|node_modules)/i.test(p)) continue
    found.add(p)
  }
  return [...found].slice(0, 12)
}

export const buildRoleTaskPrompt = (input: RoleSpeakInput): string => {
  const role = roleDefById(input.roleId)
  const name = input.assigneeUser?.displayName ?? role?.name ?? input.roleId
  if (input.speakMode === 'plan') {
    const roster =
      input.users
        ?.filter((u) => !(u.isBuiltin && u.builtinRole === 'manager'))
        .map((u) => `- assigneeUserId: "${u.id}" → ${u.displayName}（${u.role}）`)
        .join('\n') ?? ''
    const force = input.forcePlanJson
      ? '\n【紧急】上一轮未解析出 JSON。本轮最终回复只能有一个 ```json 代码块，禁止任何其它文字或英文思考。'
      : ''
    return [
      '【Collab Workshop · 技术经理 · 拆任务】',
      '先用工具查看代码；思考过程不要写入最终回复。',
      '最终回复有且仅有一个 ```json 代码块（中文步骤 title），格式：',
      '{ "steps": [ { "id": "s1", "title": "步骤标题", "assigneeUserId": "user-xxx" } ] }',
      'assigneeUserId 必须从下列用户中选择（勿指派技术经理）：',
      roster || '（暂无可用执行人，请在设置中添加用户）',
      force,
      '',
      `【用户需求】\n${input.userBrief}`,
      input.priorSummary ? `【此前讨论】\n${input.priorSummary}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  }
  if (input.speakMode === 'verify') {
    return [
      '【Collab Workshop · 技术经理 · 验收】',
      `【当前步骤】${input.step?.title ?? ''}（id: ${input.step?.id ?? ''}）`,
      `【本步产出】\n${input.stepOutput ?? ''}`,
      '请验收。首行必须是以下之一：VERIFY: approve | VERIFY: redo | VERIFY: abort',
      '其后可写简短评审意见。',
      '',
      `【用户需求】\n${input.userBrief}`,
    ].join('\n')
  }
  if (input.speakMode === 'execute' && input.assigneeUser) {
    return [
      `【Collab Workshop · ${name}（${input.assigneeUser.role}）· 执行步骤】`,
      `【本步任务】${input.step?.title ?? ''}`,
      '必须使用 Read、Grep、Glob 等工具查看真实代码后再交付。',
      '完成后用简洁中文给出：结论、已查看的文件、建议改动（可含相对路径）。',
      '',
      `【用户需求】\n${input.userBrief}`,
      input.priorSummary ? `【此前讨论】\n${input.priorSummary}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    `【Collab Workshop · ${name}】`,
    '你在多角色协作群聊中发言。必须使用 Read、Grep、Glob 等工具查看真实代码后再给结论。',
    '若用户提到路径或目录（如 zhongzhi），务必先读取再回答，禁止在未读代码时重复索要业务澄清。',
    '完成后用简洁中文给出：结论、已查看的文件、建议的后续改动（可含相对路径）。',
    '',
    `【用户需求】\n${input.userBrief}`,
    input.priorSummary ? `【此前讨论】\n${input.priorSummary}` : '',
  ]
    .filter(Boolean)
    .join('\n')
}

export const detectNeedsUserClarification = (
  roleId: RoleSpeakInput['roleId'],
  userBrief: string,
  report: string,
): { needsUser: boolean; userQuestion?: string } => {
  if (roleId !== 'manager') return { needsUser: false }
  const didRead = /已阅读|已查看|Read |Grep |Glob /i.test(report)
  if (didRead) return { needsUser: false }
  const briefAsk = /[?？]/.test(userBrief)
  const reportAsk = /需要澄清|请补充|请确认|不清楚|无法确定|NEED_CLARIFICATION/i.test(report)
  if (!briefAsk && !reportAsk) return { needsUser: false }
  const q =
    report
      .split(/[。\n]/)
      .find((l) => /[?？]|请补充|需要澄清/.test(l))
      ?.trim() || '请补充验收标准、业务场景或优先级？'
  return { needsUser: true, userQuestion: q.slice(0, 300) }
}

export const parseSubagentReport = (
  report: string,
  roleId: RoleSpeakInput['roleId'],
  userBrief: string,
): RoleSpeakOutput => {
  const summary = report.trim().slice(0, 2000) || '（无结论）'
  const relatedFiles = extractRelatedFiles(report)
  const clarify = detectNeedsUserClarification(roleId, userBrief, report)
  return {
    summary,
    relatedFiles: relatedFiles.length ? relatedFiles : undefined,
    ...clarify,
  }
}

export const subagentTypeForRole = (roleId: RoleSpeakInput['roleId']) => {
  if (roleId === 'manager' || roleId === 'tester') return 'explore' as const
  return 'generalPurpose' as const
}

export const buildSubagentRoleSpeaker = (
  projectRoot: string,
  modelId: string,
  workshopId: string,
  onStreamDelta?: (streamId: string, delta: string) => void,
): RoleSpeaker => {
  return async (input) => {
    const root = projectRoot.trim()
    if (!root) throw new Error('请先打开项目')
    const subagentType = subagentTypeForRole(input.roleId)
    const tools = buildSubAgentToolList(subagentType)
    const taskPrompt = buildRoleTaskPrompt(input)
    const streamKey =
      input.speakMode === 'execute' && input.assigneeUser
        ? `u-${input.assigneeUser.id}`
        : input.roleId
    const streamId = buildWorkshopStreamId(workshopId, streamKey)
    const roleModelId = await resolveModelIdForTask(
      modelTaskKindForWorkshopRole(input.roleId, input.speakMode),
    )
    const res = await runSubAgentTask(root, roleModelId, taskPrompt, {
      subagentType,
      tools,
      maxTurns: 14,
      partialReportOnMaxTurns: true,
      onDelta: onStreamDelta
        ? (delta) => {
            const text = (delta.content ?? '') + (delta.reasoning ?? '')
            if (text) onStreamDelta(streamId, text)
          }
        : undefined,
    })
    if (!res.ok) throw new Error(res.error)
    return parseSubagentReport(res.report, input.roleId, input.userBrief)
  }
}
