import { runSubAgentTask } from '../agent/agent-subagent'
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
  const name = role?.name ?? input.roleId
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
    const streamId = buildWorkshopStreamId(workshopId, input.roleId)
    const res = await runSubAgentTask(root, modelId, taskPrompt, {
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
