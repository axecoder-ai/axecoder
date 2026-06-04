import type { WorkshopMessage, WorkshopRoleId } from './workshop-types'

/** BOSS and Tech Lead → user; other members → assistant */
export const workshopApiRole = (roleId: WorkshopRoleId): 'user' | 'assistant' => {
  if (roleId === 'user' || roleId === 'manager') return 'user'
  return 'assistant'
}

const messageLineForPrior = (m: WorkshopMessage): string => {
  const tag =
    m.roleId === 'user'
      ? 'BOSS'
      : m.roleId === 'manager'
        ? 'Tech Lead'
        : m.roleId === 'system'
          ? 'System'
          : 'Member'
  let line = `${tag}: ${m.text.trim()}`
  const detail = m.reasoningContent?.trim()
  if (detail) {
    const head = m.text.trim().slice(0, 80)
    if (!head || !detail.startsWith(head)) {
      const excerpt = detail.length > 1500 ? `${detail.slice(0, 1500)}…` : detail
      line += `\n  (detail) ${excerpt}`
    }
  }
  return line
}

export const priorSummaryFromMessages = (messages: WorkshopMessage[], maxChars = 12000): string => {
  const visible = messages.filter((m) => !m.hidden)
  const lines = visible.map(messageLineForPrior)
  let text = lines.join('\n')
  if (text.length > maxChars) text = text.slice(-maxChars)
  return text
}

/** 最近成员发言（含 reasoning），供路由 LLM */
export const lastMemberContextFromMessages = (messages: WorkshopMessage[], maxChars = 3000): string => {
  const visible = messages.filter(
    (m) =>
      !m.hidden &&
      m.roleId !== 'user' &&
      m.roleId !== 'manager' &&
      m.roleId !== 'system' &&
      m.text.trim(),
  )
  const last = visible[visible.length - 1]
  if (!last) return ''
  let s = last.text.trim()
  const detail = last.reasoningContent?.trim()
  if (detail && !s.includes(detail.slice(0, 60))) {
    const excerpt = detail.length > 2000 ? `${detail.slice(0, 2000)}…` : detail
    s = `${s}\n${excerpt}`
  }
  if (s.length > maxChars) s = s.slice(-maxChars)
  return s
}

export const stripLegacyWorkshopFields = <T extends { stepPlan?: unknown; currentStepIndex?: unknown; phase?: string }>(
  session: T,
): T => {
  const s = { ...session }
  delete s.stepPlan
  delete s.currentStepIndex
  if (
    s.phase === 'planning' ||
    s.phase === 'step_running' ||
    s.phase === 'step_verify' ||
    s.phase === 'backend' ||
    s.phase === 'frontend' ||
    s.phase === 'tester'
  ) {
    s.phase = 'idle'
  }
  return s
}
