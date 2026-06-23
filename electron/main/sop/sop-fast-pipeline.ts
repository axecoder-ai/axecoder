import { listUsers } from '../users-store'
import type { UserEntry } from '../users-types'
import { hydrateMessagePool, MessagePool } from './message-pool'
import { classifySopIntent } from './sop-intent'
import { projectHasApplicationSource } from './sop-gates'
import { artifactBodyForGate } from './sop-artifact'
import { slugFromBrief } from './sop-types'
import { sopSoftOrchestrationPromptBlock } from './sop-prompts'
import type { SendSopPipelineOptions } from './sop-pipeline-engine'
import type {
  RoleSpeaker,
  WorkshopMessage,
  WorkshopProgressHandler,
  WorkshopRunResult,
  WorkshopSession,
} from '../workshop/workshop-types'
import { inferWorkshopRoleId } from '../workshop/workshop-user-bind'

const findBuiltin = (users: UserEntry[], role: UserEntry['builtinRole']): UserEntry | undefined =>
  users.find((u) => u.isBuiltin && u.builtinRole === role)

const pushChat = (
  session: WorkshopSession,
  roleId: WorkshopMessage['roleId'],
  text: string,
  extra?: Partial<Pick<WorkshopMessage, 'relatedFiles' | 'reasoningContent' | 'speakerUserId' | 'causeBy'>>,
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

const runFastAgentTurn = async (
  session: WorkshopSession,
  pool: MessagePool,
  developer: UserEntry,
  speaker: RoleSpeaker,
  onProgress: WorkshopProgressHandler | undefined,
  extraUserText?: string,
) => {
  const roleId = inferWorkshopRoleId(developer)
  const intent = session.sopIntent ?? 'greenfield'
  const soft = sopSoftOrchestrationPromptBlock(intent, session.sopSlug)
  const prior = [
    soft,
    pool.contextForWatch(['UserRequirement']),
    extraUserText?.trim() ? `[User clarification]\n${extraUserText.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n\n')

  onProgress?.(roleId, 'thinking', developer.id)
  const out = await speaker({
    roleId,
    userBrief: session.userBrief,
    priorSummary: prior,
    speakMode: 'member',
    assigneeUser: developer,
    sopPhase: 'implement',
    poolContext: pool.contextForWatch(['UserRequirement']),
    reuseImplementSession: true,
    sopAgentParity: true,
  })
  onProgress?.(roleId, 'done', developer.id)
  return out
}

/** Software Co. 默认：单 session 连续 Agent，软 SOP */
export const sendSopFastPipelineMessage = async (
  session: WorkshopSession,
  text: string,
  speaker: RoleSpeaker,
  onProgress?: WorkshopProgressHandler,
  options?: SendSopPipelineOptions,
): Promise<WorkshopRunResult> => {
  const trimmed = text.trim()
  if (!trimmed) return { ok: false, error: 'Message cannot be empty' }

  const projectRoot = options?.projectRoot?.trim() ?? ''
  const users = (await listUsers()).users
  const pool = hydrateMessagePool(session.sopPoolMessages)
  const developer = findBuiltin(users, 'developer')
  if (!developer) {
    pushChat(session, 'system', 'Developer role missing')
    session.phase = 'done'
    session.sopPhase = 'done'
    return { ok: true, session }
  }

  if (session.phase === 'waiting_user') {
    pushChat(session, 'user', options?.displayText?.trim() || trimmed)
    pool.publish({
      causeBy: 'UserRequirement',
      phase: session.sopPhase ?? 'implement',
      content: trimmed,
    })
    session.pendingQuestion = undefined
    session.pendingAsks = undefined
    session.phase = 'running'
    session.sopPhase = 'implement'
    session.sopPoolMessages = pool.toJSON()

    const out = await runFastAgentTurn(session, pool, developer, speaker, onProgress, trimmed)
    if (out.needsUser && (out.pendingAsks?.length || out.userQuestion?.trim())) {
      session.phase = 'waiting_user'
      session.pendingAsks = out.pendingAsks
      session.pendingQuestion = out.userQuestion
      session.sopPoolMessages = pool.toJSON()
      pushChat(session, inferWorkshopRoleId(developer), out.summary.trim(), {
        speakerUserId: developer.id,
        relatedFiles: out.relatedFiles,
        causeBy: 'WriteCode',
      })
      return { ok: true, session }
    }

    const body = artifactBodyForGate(out.summary, out.reasoningContent, out.planSource)
    pool.publish({
      causeBy: 'WriteCode',
      phase: 'implement',
      speakerUserId: developer.id,
      content: body.slice(0, 4000),
    })
    pushChat(session, inferWorkshopRoleId(developer), out.summary.trim() || body, {
      speakerUserId: developer.id,
      reasoningContent: out.reasoningContent,
      relatedFiles: out.relatedFiles,
      causeBy: 'WriteCode',
    })
    session.phase = 'done'
    session.sopPhase = 'done'
    session.sopTaskTotal = 1
    session.sopTaskIndex = 1
    session.sopPoolMessages = pool.toJSON()
    return { ok: true, session }
  }

  if (session.sopPhase === 'done' || session.phase === 'done') {
    const { runSopUserFollowUp } = await import('./sop-pipeline-engine')
    return runSopUserFollowUp(session, trimmed, pool, users, speaker, onProgress, options)
  }

  if (!session.userBrief.trim()) {
    session.userBrief = trimmed
    session.sopSlug = slugFromBrief(trimmed)
    const title = trimmed.slice(0, 24) + (trimmed.length > 24 ? '…' : '')
    if (title) session.title = title
    pushChat(session, 'user', options?.displayText?.trim() || trimmed)
    pool.publish({
      causeBy: 'UserRequirement',
      phase: 'requirement',
      content: trimmed,
    })
    const hasSource = projectRoot ? await projectHasApplicationSource(projectRoot) : false
    session.sopIntent = classifySopIntent(trimmed, hasSource)
  } else {
    pushChat(session, 'user', options?.displayText?.trim() || trimmed)
    pool.publish({
      causeBy: 'UserRequirement',
      phase: session.sopPhase ?? 'implement',
      content: trimmed,
    })
  }

  session.sopPhase = 'implement'
  session.phase = 'running'
  session.sopTaskTotal = 1
  session.sopTaskIndex = 0
  session.sopPoolMessages = pool.toJSON()

  const out = await runFastAgentTurn(session, pool, developer, speaker, onProgress)
  if (out.needsUser && (out.pendingAsks?.length || out.userQuestion?.trim())) {
    session.phase = 'waiting_user'
    session.pendingAsks = out.pendingAsks
    session.pendingQuestion = out.userQuestion
    session.sopPoolMessages = pool.toJSON()
    pushChat(session, inferWorkshopRoleId(developer), out.summary.trim(), {
      speakerUserId: developer.id,
      relatedFiles: out.relatedFiles,
      causeBy: 'WriteCode',
    })
    return { ok: true, session }
  }

  const body = artifactBodyForGate(out.summary, out.reasoningContent, out.planSource)
  pool.publish({
    causeBy: 'WriteCode',
    phase: 'implement',
    speakerUserId: developer.id,
    content: body.slice(0, 4000),
  })
  pushChat(session, inferWorkshopRoleId(developer), out.summary.trim() || body, {
    speakerUserId: developer.id,
    reasoningContent: out.reasoningContent,
    relatedFiles: out.relatedFiles,
    causeBy: 'WriteCode',
  })
  session.phase = 'done'
  session.sopPhase = 'done'
  session.sopTaskIndex = 1
  session.sopPoolMessages = pool.toJSON()
  return { ok: true, session }
}
