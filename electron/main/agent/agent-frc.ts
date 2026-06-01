import type { AgentLoopMessage } from './agent-types'

const CLEARED_PLACEHOLDER =
  '[Previous tool result cleared to save context. Important facts should already be in the assistant text above.]'

/** FRC：清理较早的 tool 消息内容（对齐 SUMMARIZE_TOOL_RESULTS 运行时） */
export const clearOldToolResults = (
  messages: AgentLoopMessage[],
  keepRecentToolMessages = 8,
) => {
  const toolIndexes: number[] = []
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === 'tool') toolIndexes.push(i)
  }
  if (toolIndexes.length <= keepRecentToolMessages) return 0

  const toClear = toolIndexes.slice(0, toolIndexes.length - keepRecentToolMessages)
  let cleared = 0
  for (const idx of toClear) {
    const m = messages[idx]
    if (m.role === 'tool' && m.content !== CLEARED_PLACEHOLDER) {
      m.content = CLEARED_PLACEHOLDER
      cleared += 1
    }
  }
  return cleared
}

export const estimateContextChars = (messages: AgentLoopMessage[]) => {
  let n = 0
  for (const m of messages) {
    if (m.role === 'system' || m.role === 'user' || m.role === 'assistant') {
      n += m.content.length
      if (m.role === 'assistant' && m.reasoningContent) n += m.reasoningContent.length
    } else if (m.role === 'tool') {
      n += m.content.length
    }
  }
  return n
}
