import { listUsers } from '../users-store'
import type { BuiltinUserRole, UserEntry } from '../users-types'
import { priorSummaryFromMessages } from './workshop-api-messages'
import { inferWorkshopRoleId } from './workshop-user-bind'
import { resolveWorkshopReplyLanguage, workshopReplyLanguageFromLocale } from './workshop-language'
import { buildWorkshopRouterLlm } from './workshop-router-llm'
import type {
  RoleSpeaker,
  RoleSpeakInput,
  WorkshopMessage,
  WorkshopProgressHandler,
  WorkshopRunResult,
  WorkshopSession,
} from './workshop-types'
import type { SendWorkshopMessageOptions } from '../coordinator/coordinator-turn-engine'

export const REFLECTION_MAX_ROUNDS = 3

export type ReflectionJudgeLLM = (prompt: string) => Promise<string>

export type ReflectionRoundJudge = {
  comment: string
  continue: boolean
}

export const parseReflectionRoundJudge = (raw: string): ReflectionRoundJudge => {
  const t = raw.trim()
  try {
    const jsonMatch = t.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const o = JSON.parse(jsonMatch[0]) as {
        comment?: string
        continue?: boolean
        cont?: boolean
      }
      return {
        comment: typeof o.comment === 'string' ? o.comment.trim() : t.slice(0, 500),
        continue: o.continue === true || o.cont === true,
      }
    }
  } catch {
    /* */
  }
  return { comment: t.slice(0, 500) || '(no comment)', continue: false }
}

export const parseReflectionComment = (raw: string): string => {
  const t = raw.trim()
  try {
    const jsonMatch = t.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const o = JSON.parse(jsonMatch[0]) as { comment?: string; summary?: string }
      if (typeof o.comment === 'string' && o.comment.trim()) return o.comment.trim()
      if (typeof o.summary === 'string' && o.summary.trim()) return o.summary.trim()
    }
  } catch {
    /* */
  }
  return t.slice(0, 500) || '(no comment)'
}

const findBuiltinUser = (users: UserEntry[], role: BuiltinUserRole) =>
  users.find((u) => u.isBuiltin && u.builtinRole === role)

const pushMessage = (
  session: WorkshopSession,
  roleId: WorkshopMessage['roleId'],
  text: string,
  extra?: Partial<Pick<WorkshopMessage, 'relatedFiles' | 'reasoningContent' | 'speakerUserId'>>,
) => {
  session.messages.push({
    id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    roleId,
    text,
    createdAt: Date.now(),
    ...extra,
  })
  session.updatedAt = Date.now()
}

const runMemberSpeak = async (
  session: WorkshopSession,
  assignee: UserEntry,
  users: UserEntry[],
  speaker: RoleSpeaker,
  onProgress?: WorkshopProgressHandler,
) => {
  const roleId = inferWorkshopRoleId(assignee)
  session.phase = 'running'
  onProgress?.(roleId, 'thinking', assignee.id)
  const inp: RoleSpeakInput = {
    roleId,
    userBrief: session.userBrief,
    priorSummary: priorSummaryFromMessages(session.messages),
    speakMode: 'member',
    assigneeUser: assignee,
    users,
  }
  onProgress?.(roleId, 'speaking', assignee.id)
  const out = await speaker(inp)
  const summary = out.summary.trim() || '(no conclusion)'
  pushMessage(session, roleId, summary, {
    relatedFiles: out.relatedFiles,
    reasoningContent: out.reasoningContent,
    speakerUserId: assignee.id,
  })
  onProgress?.(roleId, 'done', assignee.id)
  return summary
}

const runTechLeadText = async (
  session: WorkshopSession,
  manager: UserEntry,
  judgeLlm: ReflectionJudgeLLM,
  prompt: string,
  onProgress?: WorkshopProgressHandler,
): Promise<string> => {
  onProgress?.('manager', 'thinking', manager.id)
  const raw = await judgeLlm(prompt)
  const text = parseReflectionComment(raw)
  onProgress?.('manager', 'speaking', manager.id)
  pushMessage(session, 'manager', text, { speakerUserId: manager.id })
  onProgress?.('manager', 'done', manager.id)
  return text
}

export const buildReflectionJudgeLlm = (modelId: string, projectRoot: string): ReflectionJudgeLLM =>
  buildWorkshopRouterLlm(modelId, projectRoot)

export const scriptedReflectionJudgeLlm = (script: {
  afterDeveloper?: string[]
  roundJudges?: Array<{ comment: string; continue: boolean }>
  finalReport?: string
}): ReflectionJudgeLLM => {
  return async (prompt: string) => {
    if (prompt.includes('final report')) {
      return JSON.stringify({ summary: script.finalReport ?? 'Reflection complete.' })
    }
    if (prompt.includes('after Developer')) {
      const c = script.afterDeveloper?.shift() ?? 'Good progress.'
      return JSON.stringify({ comment: c })
    }
    if (prompt.includes('round judge')) {
      const j = script.roundJudges?.shift() ?? { comment: 'Done.', continue: false }
      return JSON.stringify({ comment: j.comment, continue: j.continue })
    }
    return '{}'
  }
}

export const sendReflectionMessage = async (
  session: WorkshopSession,
  text: string,
  speaker: RoleSpeaker,
  judgeLlm: ReflectionJudgeLLM,
  onProgress?: WorkshopProgressHandler,
  options?: SendWorkshopMessageOptions,
): Promise<WorkshopRunResult> => {
  const trimmed = text.trim()
  if (!trimmed && !options?.userImages?.length) return { ok: false, error: 'Message cannot be empty' }
  if (options?.userImages?.length) session.pendingUserImages = options.userImages

  const userDisplay = options?.displayText?.trim() || trimmed
  const projectRoot = options?.projectRoot?.trim() ?? ''
  const replyLanguage = projectRoot
    ? await resolveWorkshopReplyLanguage(projectRoot)
    : workshopReplyLanguageFromLocale()

  const usersFile = await listUsers()
  const users = usersFile.users
  const developer = findBuiltinUser(users, 'developer')
  const reviewer = findBuiltinUser(users, 'reviewer')
  const manager = findBuiltinUser(users, 'manager')

  if (!developer || !reviewer || !manager) {
    return { ok: false, error: 'Reflection requires builtin Developer, Reviewer, and Tech Lead users' }
  }

  const userMsgExtra =
    options?.userImageRefs?.length || options?.userImagePreviews?.length
      ? {
          ...(options.userImageRefs?.length ? { imageRefs: options.userImageRefs } : {}),
          ...(options.userImagePreviews?.length ? { imagePreviews: options.userImagePreviews } : {}),
        }
      : undefined

  if (session.phase === 'done') session.phase = 'running'
  if (session.phase === 'idle' || !session.userBrief.trim()) {
    session.userBrief = trimmed
    const title = trimmed.slice(0, 24) + (trimmed.length > 24 ? '…' : '')
    if (title) session.title = title
  }

  pushMessage(session, 'user', userDisplay, userMsgExtra)
  session.phase = 'running'

  let shouldContinue = true
  for (let round = 1; round <= REFLECTION_MAX_ROUNDS && shouldContinue; round++) {
    await runMemberSpeak(session, developer, users, speaker, onProgress)

    const priorAfterDev = priorSummaryFromMessages(session.messages)
    await runTechLeadText(
      session,
      manager,
      judgeLlm,
      [
        `[Reflection mode] Tech Lead brief comment after Developer (round ${round}/${REFLECTION_MAX_ROUNDS}).`,
        `Reply in ${replyLanguage}.`,
        'Output JSON only: {"comment":"brief guidance (1-3 sentences)"}',
        `User request: ${session.userBrief}`,
        `Discussion so far:\n${priorAfterDev}`,
      ].join('\n'),
      onProgress,
    )

    await runMemberSpeak(session, reviewer, users, speaker, onProgress)

    const priorAfterReview = priorSummaryFromMessages(session.messages)
    const isLastRound = round >= REFLECTION_MAX_ROUNDS
    const judgeRaw = await judgeLlm(
      [
        `[Reflection mode] Tech Lead round judge after Reviewer (round ${round}/${REFLECTION_MAX_ROUNDS}).`,
        `Reply in ${replyLanguage}.`,
        isLastRound
          ? 'This is the final round. Output JSON: {"comment":"brief summary","continue":false}'
          : 'Decide if another Developer↔Reviewer round is needed. Output JSON: {"comment":"brief guidance","continue":true|false}',
        `User request: ${session.userBrief}`,
        `Discussion so far:\n${priorAfterReview}`,
      ].join('\n'),
    )
    const judged = parseReflectionRoundJudge(judgeRaw)
    shouldContinue = !isLastRound && judged.continue
    onProgress?.('manager', 'thinking', manager.id)
    onProgress?.('manager', 'speaking', manager.id)
    pushMessage(session, 'manager', judged.comment, { speakerUserId: manager.id })
    onProgress?.('manager', 'done', manager.id)
  }

  const priorFinal = priorSummaryFromMessages(session.messages)
  const finalRaw = await judgeLlm(
    [
      '[Reflection mode] Tech Lead final report to user.',
      `Reply in ${replyLanguage}.`,
      'All reflection rounds are done. Summarize outcomes and next steps for the user.',
      'Output JSON only: {"summary":"final report"}',
      `User request: ${session.userBrief}`,
      `Full discussion:\n${priorFinal}`,
    ].join('\n'),
  )
  const finalText = parseReflectionComment(finalRaw)
  onProgress?.('manager', 'thinking', manager.id)
  onProgress?.('manager', 'speaking', manager.id)
  pushMessage(session, 'manager', finalText, { speakerUserId: manager.id })
  onProgress?.('manager', 'done', manager.id)
  session.phase = 'done'
  session.pendingQuestion = undefined

  return { ok: true, session }
}
