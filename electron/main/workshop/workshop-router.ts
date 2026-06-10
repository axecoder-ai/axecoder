import type { UserEntry } from '../users-types'
import {
  workshopLanguageInstruction,
  workshopReplyLanguageFromLocale,
} from './workshop-language'

export type PickSpeakerResult =
  | { ok: true; assigneeUserId: string }
  | { ok: false; error: string }

export type RouteTurnResult =
  | { kind: 'boss_clarify'; question: string }
  | { kind: 'manager' }
  | { kind: 'done' }

export type ManagerTurnResult =
  | { ok: true; summary: string; assigneeUserId?: string; done: boolean }
  | { ok: false; error: string }

const jsonBlock = (text: string): string | null => {
  const m = text.match(/```(?:json)?\s*([\s\S]*?)```/) ?? text.match(/\{[\s\S]*\}/)
  if (!m) return null
  return m[1]?.trim() ?? m[0]?.trim() ?? null
}

export const employeeUsers = (users: UserEntry[]): UserEntry[] =>
  users.filter((u) => !(u.isBuiltin && u.builtinRole === 'manager'))

export const findManager = (users: UserEntry[]): UserEntry | undefined =>
  users.find((u) => u.isBuiltin && u.builtinRole === 'manager')

export const parsePickSpeaker = (raw: string, users: UserEntry[]): PickSpeakerResult => {
  const block = jsonBlock(raw)
  if (!block) return { ok: false, error: 'Casting route: JSON not found' }
  try {
    const o = JSON.parse(block) as { assigneeUserId?: string }
    const id = typeof o.assigneeUserId === 'string' ? o.assigneeUserId.trim() : ''
    if (!id) return { ok: false, error: 'Casting route: missing assigneeUserId' }
    const u = users.find((x) => x.id === id)
    if (!u) return { ok: false, error: `Casting route: user ${id} does not exist` }
    if (u.isBuiltin && u.builtinRole === 'manager') {
      return { ok: false, error: 'Casting route: cannot assign Tech Lead to member tasks' }
    }
    return { ok: true, assigneeUserId: id }
  } catch {
    return { ok: false, error: 'Casting route: JSON parse failed' }
  }
}

export const parseRouteTurn = (raw: string): RouteTurnResult | { ok: false; error: string } => {
  const block = jsonBlock(raw)
  if (!block) return { ok: false, error: 'Turn route: JSON not found' }
  try {
    const o = JSON.parse(block) as { next?: string; question?: string }
    const next = typeof o.next === 'string' ? o.next.trim() : ''
    if (next === 'boss_clarify') {
      const q = typeof o.question === 'string' ? o.question.trim() : ''
      if (!q) return { ok: false, error: 'Turn route: boss_clarify missing question' }
      return { kind: 'boss_clarify', question: q }
    }
    if (next === 'manager') return { kind: 'manager' }
    if (next === 'done') return { kind: 'done' }
    return { ok: false, error: `Turn route: unknown next=${next}` }
  } catch {
    return { ok: false, error: 'Turn route: JSON parse failed' }
  }
}

export const parseManagerTurn = (raw: string, users: UserEntry[]): ManagerTurnResult => {
  const block = jsonBlock(raw)
  if (!block) return { ok: false, error: 'Manager turn: JSON not found' }
  try {
    const o = JSON.parse(block) as {
      summary?: string
      assigneeUserId?: string
      done?: boolean
    }
    const summary = typeof o.summary === 'string' ? o.summary.trim() : ''
    if (!summary) return { ok: false, error: 'Manager turn: missing summary' }
    const done = !!o.done
    const assigneeUserId =
      typeof o.assigneeUserId === 'string' ? o.assigneeUserId.trim() : undefined
    if (!done && assigneeUserId) {
      const u = users.find((x) => x.id === assigneeUserId)
      if (!u) return { ok: false, error: `Manager turn: user ${assigneeUserId} does not exist` }
      if (u.isBuiltin && u.builtinRole === 'manager') {
        return { ok: false, error: 'Manager turn: cannot assign Tech Lead as executor' }
      }
    }
    if (!done && !assigneeUserId) {
      return { ok: false, error: 'Manager turn: assigneeUserId required when not done' }
    }
    return { ok: true, summary, assigneeUserId, done }
  } catch {
    return { ok: false, error: 'Manager turn: JSON parse failed' }
  }
}

export const buildPickSpeakerPrompt = (userBrief: string, priorSummary: string, users: UserEntry[]): string => {
  const roster = employeeUsers(users)
    .map((u) => `- "${u.id}": ${u.displayName} (${u.role})${u.expertise ? ` · ${u.expertise}` : ''}`)
    .join('\n')
  return [
    'From the BOSS message and discussion, pick the next member who should speak.',
    'Output one JSON only: {"assigneeUserId":"user-xxx"}',
    '',
    `[Task] ${userBrief}`,
    priorSummary ? `[Discussion]\n${priorSummary}` : '',
    '[Available members]',
    roster || '(none)',
  ]
    .filter(Boolean)
    .join('\n')
}

export const buildRouteTurnPrompt = (
  userBrief: string,
  priorSummary: string,
  memberSummary: string,
  memberDetail?: string,
): string =>
  [
    'A member just finished speaking. Decide who gets the turn:',
    '- boss_clarify: must clarify with BOSS (output question)',
    '- manager: hand off to Tech Lead to coordinate',
    '- done: all work is complete',
    'Output JSON only: {"next":"manager|boss_clarify|done","question":""}',
    '',
    `[Task] ${userBrief}`,
    priorSummary ? `[Discussion]\n${priorSummary}` : '',
    `[Latest member conclusion]\n${memberSummary}`,
    memberDetail?.trim() ? `[Latest member detail]\n${memberDetail.trim()}` : '',
  ]
    .filter(Boolean)
    .join('\n')

export const buildManagerTurnPrompt = (
  userBrief: string,
  priorSummary: string,
  users: UserEntry[],
  codeBrief?: string,
  replyLanguage?: string,
): string => {
  const lang = replyLanguage?.trim() || workshopReplyLanguageFromLocale()
  const roster = employeeUsers(users)
    .map((u) => `- "${u.id}": ${u.displayName} (${u.role})`)
    .join('\n')
  return [
    'You are the Tech Lead, speaking for the BOSS and assigning work.',
    workshopLanguageInstruction(lang),
    `Output JSON: {"summary":"message to the group in ${lang}","assigneeUserId":"user-xxx","done":false}`,
    `If all work is done: {"summary":"closing message in ${lang}","done":true} (omit assigneeUserId)`,
    '',
    `[Task] ${userBrief}`,
    priorSummary ? `[Discussion]\n${priorSummary}` : '',
    codeBrief?.trim() ? `[Tech Lead codebase notes]\n${codeBrief.trim()}` : '',
    '[Assignable members]',
    roster || '(none)',
  ]
    .filter(Boolean)
    .join('\n')
}

export type RouterLLM = (prompt: string) => Promise<string>

export const pickNextSpeaker = async (
  llm: RouterLLM,
  userBrief: string,
  priorSummary: string,
  users: UserEntry[],
): Promise<PickSpeakerResult> => {
  const raw = await llm(buildPickSpeakerPrompt(userBrief, priorSummary, users))
  return parsePickSpeaker(raw, users)
}

export const routeTurnAfterMember = async (
  llm: RouterLLM,
  userBrief: string,
  priorSummary: string,
  memberSummary: string,
  memberDetail?: string,
): Promise<RouteTurnResult | { ok: false; error: string }> => {
  const raw = await llm(buildRouteTurnPrompt(userBrief, priorSummary, memberSummary, memberDetail))
  return parseRouteTurn(raw)
}

export const runManagerTurnLlm = async (
  llm: RouterLLM,
  userBrief: string,
  priorSummary: string,
  users: UserEntry[],
  codeBrief?: string,
  replyLanguage?: string,
): Promise<ManagerTurnResult> => {
  const raw = await llm(
    buildManagerTurnPrompt(userBrief, priorSummary, users, codeBrief, replyLanguage),
  )
  return parseManagerTurn(raw, users)
}
