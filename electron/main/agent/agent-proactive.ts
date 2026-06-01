import type { StoredAgentSession } from './agent-session-store'

/** Proactive / Kairos：会话 tick，注入温和提醒 */
export const maybeInjectProactiveReminder = (session: StoredAgentSession) => {
  if (!session.proactiveEnabled) return
  session.proactiveTick = (session.proactiveTick ?? 0) + 1
  if (session.proactiveTick % 4 !== 0) return

  session.messages.push({
    role: 'user',
    content:
      '<system-reminder>Proactive check-in: if the task is complete, summarize and stop. If blocked, state the blocker. Do not start unrelated work.</system-reminder>',
  })
}
