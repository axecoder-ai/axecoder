import { listUsers } from '../users-store'
import { priorSummaryFromMessages } from './workshop-api-messages'
import { inferWorkshopRoleId, findUserById } from './workshop-user-bind'
import {
  pickNextSpeaker,
  routeTurnAfterMember,
  runManagerTurnLlm,
  findManager,
  type RouterLLM,
} from './workshop-router'
import type {
  RoleSpeaker,
  RoleSpeakInput,
  WorkshopMessage,
  WorkshopProgressPayload,
  WorkshopRunResult,
  WorkshopSession,
} from './workshop-types'

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
  assignee: import('../users-types').UserEntry,
  users: import('../users-types').UserEntry[],
  speaker: RoleSpeaker,
  onProgress?: (roleId: WorkshopProgressPayload['roleId'], status: 'thinking' | 'speaking' | 'done') => void,
) => {
  const roleId = inferWorkshopRoleId(assignee)
  session.phase = 'running'
  onProgress?.(roleId, 'thinking')
  const inp: RoleSpeakInput = {
    roleId,
    userBrief: session.userBrief,
    priorSummary: priorSummaryFromMessages(session.messages),
    speakMode: 'member',
    assigneeUser: assignee,
    users,
  }
  onProgress?.(roleId, 'speaking')
  const out = await speaker(inp)
  onProgress?.(roleId, 'done')
  const summary = out.summary.trim() || '(no conclusion)'
  pushMessage(session, roleId, summary, {
    relatedFiles: out.relatedFiles,
    speakerUserId: assignee.id,
  })
  return summary
}

const runManagerSpeak = async (
  session: WorkshopSession,
  users: import('../users-types').UserEntry[],
  routerLlm: RouterLLM,
  onProgress?: (roleId: WorkshopProgressPayload['roleId'], status: 'thinking' | 'speaking' | 'done') => void,
) => {
  onProgress?.('manager', 'thinking')
  const prior = priorSummaryFromMessages(session.messages)
  const mgr = await runManagerTurnLlm(routerLlm, session.userBrief, prior, users)
  if (!mgr.ok) {
    pushMessage(session, 'system', `Tech Lead routing failed: ${mgr.error}`)
    session.phase = 'done'
    return { done: true as const }
  }
  onProgress?.('manager', 'speaking')
  const manager = findManager(users)
  pushMessage(session, 'manager', mgr.summary, { speakerUserId: manager?.id })
  onProgress?.('manager', 'done')
  if (mgr.done) {
    session.phase = 'done'
    session.pendingQuestion = undefined
    return { done: true as const }
  }
  const assignee = mgr.assigneeUserId ? findUserById(users, mgr.assigneeUserId) : undefined
  if (!assignee) {
    pushMessage(session, 'system', 'Tech Lead did not assign a valid executor; collaboration ended.')
    session.phase = 'done'
    return { done: true as const }
  }
  return { done: false as const, assignee }
}

const runManagerFinalReport = async (
  session: WorkshopSession,
  users: import('../users-types').UserEntry[],
  routerLlm: RouterLLM,
  onProgress?: (roleId: WorkshopProgressPayload['roleId'], status: 'thinking' | 'speaking' | 'done') => void,
) => {
  onProgress?.('manager', 'thinking')
  const prior = priorSummaryFromMessages(session.messages)
  const mgr = await runManagerTurnLlm(
    routerLlm,
    session.userBrief,
    `${prior}\n[Note] All member work is done. Give BOSS a final report and end collaboration (done:true).`,
    users,
  )
  onProgress?.('manager', 'speaking')
  const manager = findManager(users)
  const summary = mgr.ok ? mgr.summary : 'All tasks done; see member reports above.'
  pushMessage(session, 'manager', summary, { speakerUserId: manager?.id })
  onProgress?.('manager', 'done')
  session.phase = 'done'
  session.pendingQuestion = undefined
}

const afterMemberSummary = async (
  session: WorkshopSession,
  memberSummary: string,
  users: import('../users-types').UserEntry[],
  routerLlm: RouterLLM,
  speaker: RoleSpeaker,
  onProgress?: (roleId: WorkshopProgressPayload['roleId'], status: 'thinking' | 'speaking' | 'done') => void,
): Promise<WorkshopRunResult> => {
  const prior = priorSummaryFromMessages(session.messages)
  const routed = await routeTurnAfterMember(routerLlm, session.userBrief, prior, memberSummary)
  if ('ok' in routed && routed.ok === false) {
    pushMessage(session, 'system', `Turn routing failed: ${routed.error}`)
    session.phase = 'done'
    return { ok: true, session }
  }
  if (routed.kind === 'boss_clarify') {
    session.phase = 'waiting_user'
    session.pendingQuestion = routed.question
    return { ok: true, session }
  }
  if (routed.kind === 'done') {
    await runManagerFinalReport(session, users, routerLlm, onProgress)
    return { ok: true, session }
  }
  const mgrRes = await runManagerSpeak(session, users, routerLlm, onProgress)
  if (mgrRes.done) return { ok: true, session }
  const summary = await runMemberSpeak(session, mgrRes.assignee, users, speaker, onProgress)
  return afterMemberSummary(session, summary, users, routerLlm, speaker, onProgress)
}

export const sendWorkshopMessage = async (
  session: WorkshopSession,
  text: string,
  speaker: RoleSpeaker,
  routerLlm: RouterLLM,
  onProgress?: (roleId: WorkshopProgressPayload['roleId'], status: 'thinking' | 'speaking' | 'done') => void,
  displayText?: string,
  userImages?: import('../models-types').AiChatImagePart[],
): Promise<WorkshopRunResult> => {
  const trimmed = text.trim()
  if (!trimmed && !userImages?.length) return { ok: false, error: 'Message cannot be empty' }
  if (userImages?.length) session.pendingUserImages = userImages
  const userDisplay = displayText?.trim() || trimmed

  const usersFile = await listUsers()
  const users = usersFile.users

  if (session.phase === 'waiting_user') {
    pushMessage(session, 'user', userDisplay)
    session.pendingQuestion = undefined
    session.phase = 'running'
    const prior = priorSummaryFromMessages(session.messages)
    const picked = await pickNextSpeaker(routerLlm, session.userBrief, prior, users)
    if (!picked.ok) {
      pushMessage(session, 'system', `Casting failed: ${picked.error}`)
      session.phase = 'done'
      return { ok: true, session }
    }
    const assignee = findUserById(users, picked.assigneeUserId)
    if (!assignee) {
      pushMessage(session, 'system', 'Casting failed: executor does not exist')
      session.phase = 'done'
      return { ok: true, session }
    }
    const summary = await runMemberSpeak(session, assignee, users, speaker, onProgress)
    return afterMemberSummary(session, summary, users, routerLlm, speaker, onProgress)
  }

  if (session.phase === 'done') {
    session.phase = 'running'
  }

  if (session.phase === 'idle' || !session.userBrief.trim()) {
    session.userBrief = trimmed
    const title = trimmed.slice(0, 24) + (trimmed.length > 24 ? '…' : '')
    if (title) session.title = title
  }

  pushMessage(session, 'user', userDisplay)
  session.phase = 'running'

  const mgrRes = await runManagerSpeak(session, users, routerLlm, onProgress)
  if (mgrRes.done) return { ok: true, session }
  const summary = await runMemberSpeak(session, mgrRes.assignee, users, speaker, onProgress)
  return afterMemberSummary(session, summary, users, routerLlm, speaker, onProgress)
}

/** QA用：固定路由 */
export const scriptedRouterLlm =
  (script: {
    picks?: string[]
    turns?: Array<'manager' | 'boss_clarify' | 'done'>
    clarifyQuestion?: string
    manager?: Array<{ summary: string; assigneeUserId?: string; done?: boolean }>
  }): RouterLLM =>
  async (prompt: string) => {
    if (prompt.includes('pick who should speak next')) {
      const id = script.picks?.shift() ?? 'u-backend'
      return JSON.stringify({ assigneeUserId: id })
    }
    if (prompt.includes('who gets the turn')) {
      const next = script.turns?.shift() ?? 'manager'
      if (next === 'boss_clarify') {
        return JSON.stringify({
          next: 'boss_clarify',
          question: script.clarifyQuestion ?? 'Please confirm the scope?',
        })
      }
      if (next === 'done') return JSON.stringify({ next: 'done' })
      return JSON.stringify({ next: 'manager' })
    }
    if (prompt.includes('speaking for the BOSS')) {
      const m = script.manager?.shift() ?? {
        summary: 'Please continue',
        assigneeUserId: 'u-frontend',
        done: false,
      }
      return JSON.stringify(m)
    }
    return '{}'
  }

export const scriptedMemberSpeaker: RoleSpeaker = async (input) => {
  const name = input.assigneeUser?.displayName ?? input.roleId
  return { summary: `${name} completed this segment (scripted)` }
}
