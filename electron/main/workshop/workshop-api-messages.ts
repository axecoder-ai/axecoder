import type { WorkshopMessage, WorkshopRoleId } from './workshop-types'

/** BOSS and Tech Lead → user; other members → assistant */
export const workshopApiRole = (roleId: WorkshopRoleId): 'user' | 'assistant' => {
  if (roleId === 'user' || roleId === 'manager') return 'user'
  return 'assistant'
}

export const priorSummaryFromMessages = (messages: WorkshopMessage[], maxChars = 6000): string => {
  const visible = messages.filter((m) => !m.hidden)
  const lines: string[] = []
  for (const m of visible) {
    const tag =
      m.roleId === 'user'
        ? 'BOSS'
        : m.roleId === 'manager'
          ? 'Tech Lead'
          : m.roleId === 'system'
            ? 'System'
            : 'Member'
    lines.push(`${tag}: ${m.text.trim()}`)
  }
  let text = lines.join('\n')
  if (text.length > maxChars) text = text.slice(-maxChars)
  return text
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
