import type { AgentLoopMessage } from './agent-types'
import { estimateContextChars } from './agent-frc'

const COMPACT_SUMMARY_PREFIX = '<system-reminder>\nConversation compacted. Earlier summary:\n'

export const shouldAutoCompact = (messages: AgentLoopMessage[], thresholdChars: number) =>
  estimateContextChars(messages) > thresholdChars

/** 规则压缩：保留 system + Recent N 条非 system，中间折叠为摘要占位 */
export const compactAgentMessages = (
  messages: AgentLoopMessage[],
  keepTail = 24,
): { messages: AgentLoopMessage[]; summary: string } => {
  if (messages.length <= keepTail + 1) {
    return { messages: [...messages], summary: '' }
  }

  const system = messages.filter((m) => m.role === 'system')
  const rest = messages.filter((m) => m.role !== 'system')
  const tail = rest.slice(-keepTail)
  const dropped = rest.slice(0, rest.length - keepTail)

  const userAssistantCount = dropped.filter((m) => m.role === 'user' || m.role === 'assistant').length
  const toolCleared = dropped.filter((m) => m.role === 'tool').length
  const summary = `Dropped ${dropped.length} older messages (${userAssistantCount} user/assistant, ${toolCleared} tool). Key details may have been lost — re-read files if needed.`

  const compactUserMsg: AgentLoopMessage = {
    role: 'user',
    content: `${COMPACT_SUMMARY_PREFIX}${summary}\n</system-reminder>`,
  }

  return {
    messages: [...system, compactUserMsg, ...tail],
    summary,
  }
}
