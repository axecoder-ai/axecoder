import { runSubAgentTask } from '../agent/agent-subagent'
import { modelTaskKindForWorkshopRole, resolveModelIdForTask } from '../ai/model-resolve'
import { buildSubAgentToolList } from '../agent/agent-tool-registry'
import { buildWorkshopStreamId } from './workshop-stream'
import { enrichRoleSpeakInputWithSkills } from './workshop-user-skills'
import { sopFollowUpPromptBlock, sopPhasePromptBlock, sopResearchAuditPromptBlock, workshopAgentParityPromptBlock } from '../sop/sop-prompts'
import {
  resolveWorkshopReplyLanguage,
  workshopLanguageInstruction,
  workshopReplyLanguageFromLocale,
} from './workshop-language'
import type { RoleSpeaker, RoleSpeakInput, RoleSpeakOutput } from './workshop-types'

const PATH_IN_TEXT =
  /(?:^|[\s'"`，。（(])(\.{0,2}\/?[\w@./-]+(?:\.[a-zA-Z0-9]{1,6})?|zhongzhi[\w/.-]*)/g

const PATH_ROOT =
  /^(?:\.\.?|src|electron|tests|docs|shared|resources|skills|scripts|public|build|\.cursor|node_modules)$/

/** 过滤误匹配的技术名词、编号等 */
const looksLikeFilePath = (raw: string): boolean => {
  const p = raw.replace(/^@/, '').trim()
  if (!p || p.length < 3) return false
  if (/^\d+\.?$/.test(p)) return false
  if (/^(https?|npm):/i.test(p)) return false
  if (p.startsWith('zhongzhi')) return true
  if (/\.[a-zA-Z][\w]{0,7}$/.test(p)) return true
  if (!p.includes('/')) return false
  const parts = p.split('/').filter(Boolean)
  if (parts.length < 2) return false
  if (parts.length === 2 && parts.every((seg) => /^[A-Z]{1,5}$/.test(seg))) return false
  const last = parts[parts.length - 1]
  if (/\.[a-zA-Z][\w]{0,7}$/.test(last)) return true
  if (PATH_ROOT.test(parts[0])) return true
  return parts.every((seg) => /^[\w@.-]+$/.test(seg) && seg.length > 1)
}

export const extractRelatedFiles = (text: string): string[] => {
  const found = new Set<string>()
  let m: RegExpExecArray | null
  const re = new RegExp(PATH_IN_TEXT.source, PATH_IN_TEXT.flags)
  while ((m = re.exec(text))) {
    const p = m[1]?.replace(/^@/, '').trim()
    if (!p || !looksLikeFilePath(p)) continue
    found.add(p)
  }
  return [...found].slice(0, 12)
}

export const buildRoleTaskPrompt = (input: RoleSpeakInput, replyLanguage?: string): string => {
  const lang = replyLanguage?.trim() || workshopReplyLanguageFromLocale()
  const langLine = workshopLanguageInstruction(lang)
  const name = input.assigneeUser?.displayName?.trim() || input.roleId
  if (input.speakMode === 'manager_chat' && input.assigneeUser) {
    return [
      `[Collab Workshop · ${name} (${input.assigneeUser.role}) · Tech Lead]`,
      langLine,
      input.workshopAgentParity ? workshopAgentParityPromptBlock() : '',
      'Same tool capabilities as Chat Agent mode: Read, Write, Grep, Glob, CodeGraph, Bash, etc.',
      'Inspect the codebase with tools before concluding; answer substantively for routing.',
      '',
      `[User request]\n${input.userBrief}`,
      input.priorSummary ? `[Prior discussion]\n${input.priorSummary}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  }
  if (input.speakMode === 'member' && input.assigneeUser) {
    const sopBlock = input.sopAgentParity
      ? ''
      : sopPhasePromptBlock(input.sopPhase, input.poolContext)
    const followUpBlock = input.sopPhase === 'done' ? sopFollowUpPromptBlock() : ''
    const auditBlock =
      input.sopPhase === 'done' && input.assigneeUser.builtinRole === 'researcher'
        ? sopResearchAuditPromptBlock()
        : ''
    return [
      `[Collab Workshop · ${name} (${input.assigneeUser.role}) · group message]`,
      langLine,
      input.workshopAgentParity ? workshopAgentParityPromptBlock() : '',
      sopBlock,
      followUpBlock,
      auditBlock,
      'Same tool capabilities as Chat Agent mode. Use tools on real code before delivering.',
      'Answer the user request substantively; list changed/touched paths when applicable.',
      input.skillPromptBlock ?? '',
      '',
      `[User request]\n${input.userBrief}`,
      input.priorSummary ? `[Prior discussion]\n${input.priorSummary}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  }
  if (input.speakMode === 'plan') {
    const roster =
      input.users
        ?.filter((u) => !(u.isBuiltin && u.builtinRole === 'manager'))
        .map((u) => `- assigneeUserId: "${u.id}" → ${u.displayName} (${u.role})`)
        .join('\n') ?? ''
    const force = input.forcePlanJson
      ? '\n[Urgent] Last round JSON parse failed. This round: one ```json block only—no other text.'
      : ''
    return [
      '[Collab Workshop · Tech Lead · plan steps】',
      langLine,
      'Inspect code with tools first; do not put reasoning in the final reply.',
      `Final reply must be exactly one \`\`\`json block (${lang} step titles):`,
      '{ "steps": [ { "id": "s1", "title": "Step title", "assigneeUserId": "user-xxx" } ] }',
      'assigneeUserId must be chosen from the list below (do not assign Tech Lead):',
      roster || '(No executors yet; add users in Settings)',
      force,
      '',
      `[User request]\n${input.userBrief}`,
      input.priorSummary ? `[Prior discussion]\n${input.priorSummary}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  }
  if (input.speakMode === 'verify') {
    return [
      '[Collab Workshop · Tech Lead · verification]',
      langLine,
      `[Current step] ${input.step?.title ?? ''} (id: ${input.step?.id ?? ''})`,
      `[Step output]\n${input.stepOutput ?? ''}`,
      'Review this step. First line must be one of: VERIFY: approve | VERIFY: redo | VERIFY: abort',
      'You may add brief review notes after that.',
      '',
      `[User request]\n${input.userBrief}`,
    ].join('\n')
  }
  if (input.speakMode === 'execute' && input.assigneeUser) {
    return [
      `[Collab Workshop · ${name} (${input.assigneeUser.role}) · execute step]`,
      langLine,
      input.workshopAgentParity ? workshopAgentParityPromptBlock() : '',
      `[Step task] ${input.step?.title ?? ''}`,
      'Same tool capabilities as Chat Agent mode. Use tools on real code before delivering.',
      'Answer substantively; list changed/touched paths when applicable.',
      input.skillPromptBlock ?? '',
      '',
      `[User request]\n${input.userBrief}`,
      input.priorSummary ? `[Prior discussion]\n${input.priorSummary}` : '',
    ]
      .filter(Boolean)
      .join('\n')
  }
  return [
    `[Collab Workshop · ${name}]`,
    langLine,
    'Same tool capabilities as Chat Agent mode. Use Read, Grep, Glob, CodeGraph on real code before concluding.',
    'If the user names a path or directory, read it first; do not ask for business clarification without reading code.',
    'Reply with a substantive conclusion, files inspected, and suggested follow-ups.',
    '',
    `[User request]\n${input.userBrief}`,
    input.priorSummary ? `[Prior discussion]\n${input.priorSummary}` : '',
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
  const didRead = /already read|inspected|Read |Grep |Glob /i.test(report)
  if (didRead) return { needsUser: false }
  const briefAsk = /[?？]/.test(userBrief)
  const reportAsk = /need clarification|please clarify|please confirm|unclear|cannot determine|NEED_CLARIFICATION/i.test(report)
  if (!briefAsk && !reportAsk) return { needsUser: false }
  const q =
    report
      .split(/[。\n]/)
      .find((l) => /[?？]|please clarify|need clarification/i.test(l))
      ?.trim() || 'Please clarify acceptance criteria, scenario, or priority?'
  return { needsUser: true, userQuestion: q.slice(0, 300) }
}

export const parseSubagentReport = (
  report: string,
  roleId: RoleSpeakInput['roleId'],
  userBrief: string,
): RoleSpeakOutput => {
  const summary = report.trim().slice(0, 2000) || '(no conclusion)'
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
    if (!root) throw new Error('Open a project first')
    const enriched = await enrichRoleSpeakInputWithSkills(input, root)
    const subagentType = subagentTypeForRole(enriched.roleId)
    const tools = buildSubAgentToolList(subagentType)
    const replyLanguage = await resolveWorkshopReplyLanguage(root)
    const taskPrompt = buildRoleTaskPrompt(enriched, replyLanguage)
    const streamKey =
      enriched.speakMode === 'execute' && enriched.assigneeUser
        ? `u-${enriched.assigneeUser.id}`
        : enriched.roleId
    const streamId = buildWorkshopStreamId(workshopId, streamKey)
    const roleModelId = await resolveModelIdForTask(
      modelTaskKindForWorkshopRole(enriched.roleId, enriched.speakMode),
    )
    const res = await runSubAgentTask(root, roleModelId, taskPrompt, {
      subagentType,
      tools,
      maxTurns: 14,
      partialReportOnMaxTurns: true,
      onDelta: onStreamDelta
        ? (delta) => {
            const text = delta.content ?? ''
            if (text) onStreamDelta(streamId, text)
          }
        : undefined,
    })
    if (!res.ok) throw new Error(res.error)
    return parseSubagentReport(res.report, enriched.roleId, enriched.userBrief)
  }
}
