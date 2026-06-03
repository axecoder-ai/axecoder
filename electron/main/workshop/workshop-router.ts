import type { UserEntry } from '../users-types'

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
  if (!block) return { ok: false, error: '路由选角：未找到 JSON' }
  try {
    const o = JSON.parse(block) as { assigneeUserId?: string }
    const id = typeof o.assigneeUserId === 'string' ? o.assigneeUserId.trim() : ''
    if (!id) return { ok: false, error: '路由选角：缺少 assigneeUserId' }
    const u = users.find((x) => x.id === id)
    if (!u) return { ok: false, error: `路由选角：用户 ${id} 不存在` }
    if (u.isBuiltin && u.builtinRole === 'manager') {
      return { ok: false, error: '路由选角：不能指派技术经理执行成员任务' }
    }
    return { ok: true, assigneeUserId: id }
  } catch {
    return { ok: false, error: '路由选角：JSON 解析失败' }
  }
}

export const parseRouteTurn = (raw: string): RouteTurnResult | { ok: false; error: string } => {
  const block = jsonBlock(raw)
  if (!block) return { ok: false, error: '路由话语权：未找到 JSON' }
  try {
    const o = JSON.parse(block) as { next?: string; question?: string }
    const next = typeof o.next === 'string' ? o.next.trim() : ''
    if (next === 'boss_clarify') {
      const q = typeof o.question === 'string' ? o.question.trim() : ''
      if (!q) return { ok: false, error: '路由话语权：boss_clarify 缺少 question' }
      return { kind: 'boss_clarify', question: q }
    }
    if (next === 'manager') return { kind: 'manager' }
    if (next === 'done') return { kind: 'done' }
    return { ok: false, error: `路由话语权：未知 next=${next}` }
  } catch {
    return { ok: false, error: '路由话语权：JSON 解析失败' }
  }
}

export const parseManagerTurn = (raw: string, users: UserEntry[]): ManagerTurnResult => {
  const block = jsonBlock(raw)
  if (!block) return { ok: false, error: '经理回合：未找到 JSON' }
  try {
    const o = JSON.parse(block) as {
      summary?: string
      assigneeUserId?: string
      done?: boolean
    }
    const summary = typeof o.summary === 'string' ? o.summary.trim() : ''
    if (!summary) return { ok: false, error: '经理回合：缺少 summary' }
    const done = !!o.done
    const assigneeUserId =
      typeof o.assigneeUserId === 'string' ? o.assigneeUserId.trim() : undefined
    if (!done && assigneeUserId) {
      const u = users.find((x) => x.id === assigneeUserId)
      if (!u) return { ok: false, error: `经理回合：用户 ${assigneeUserId} 不存在` }
      if (u.isBuiltin && u.builtinRole === 'manager') {
        return { ok: false, error: '经理回合：不能指派技术经理为执行人' }
      }
    }
    if (!done && !assigneeUserId) {
      return { ok: false, error: '经理回合：未结束时必须 assigneeUserId' }
    }
    return { ok: true, summary, assigneeUserId, done }
  } catch {
    return { ok: false, error: '经理回合：JSON 解析失败' }
  }
}

export const buildPickSpeakerPrompt = (userBrief: string, priorSummary: string, users: UserEntry[]): string => {
  const roster = employeeUsers(users)
    .map((u) => `- "${u.id}": ${u.displayName}（${u.role}）${u.expertise ? ` · ${u.expertise}` : ''}`)
    .join('\n')
  return [
    '根据 BOSS 最新发言与讨论，选出下一个最应接话的成员。',
    '只输出一个 JSON：{"assigneeUserId":"user-xxx"}',
    '',
    `【任务】${userBrief}`,
    priorSummary ? `【讨论】\n${priorSummary}` : '',
    '【可选成员】',
    roster || '（无）',
  ]
    .filter(Boolean)
    .join('\n')
}

export const buildRouteTurnPrompt = (
  userBrief: string,
  priorSummary: string,
  memberSummary: string,
): string =>
  [
    '某成员刚发言完毕。判断话语权交给谁：',
    '- boss_clarify：必须向 BOSS 澄清/确认（输出 question）',
    '- manager：交给技术经理协调/派活',
    '- done：任务已全部完成',
    '只输出 JSON：{"next":"manager|boss_clarify|done","question":""}',
    '',
    `【任务】${userBrief}`,
    priorSummary ? `【讨论】\n${priorSummary}` : '',
    `【刚发言成员结论】\n${memberSummary}`,
  ]
    .filter(Boolean)
    .join('\n')

export const buildManagerTurnPrompt = (
  userBrief: string,
  priorSummary: string,
  users: UserEntry[],
): string => {
  const roster = employeeUsers(users)
    .map((u) => `- "${u.id}": ${u.displayName}（${u.role}）`)
    .join('\n')
  return [
    '你是技术经理，代替 BOSS 发言并派活。',
    '输出 JSON：{"summary":"对群说的中文","assigneeUserId":"user-xxx","done":false}',
    '若任务已全部完成：{"summary":"结束语","done":true}（不要 assigneeUserId）',
    '',
    `【任务】${userBrief}`,
    priorSummary ? `【讨论】\n${priorSummary}` : '',
    '【可指派成员】',
    roster || '（无）',
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
): Promise<RouteTurnResult | { ok: false; error: string }> => {
  const raw = await llm(buildRouteTurnPrompt(userBrief, priorSummary, memberSummary))
  return parseRouteTurn(raw)
}

export const runManagerTurnLlm = async (
  llm: RouterLLM,
  userBrief: string,
  priorSummary: string,
  users: UserEntry[],
): Promise<ManagerTurnResult> => {
  const raw = await llm(buildManagerTurnPrompt(userBrief, priorSummary, users))
  return parseManagerTurn(raw, users)
}
