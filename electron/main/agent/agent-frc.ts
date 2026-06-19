import type { AgentLoopMessage } from './agent-types'

const CLEARED_PLACEHOLDER =
  '[Previous tool result cleared to save context. Important facts should already be in the assistant text above.]'

/** 单条 tool 消息写入会话 / API 的上限（约 12k tokens） */
export const MAX_AGENT_TOOL_MESSAGE_CHARS = 48_000

export const capToolMessageContent = (
  content: string,
  max = MAX_AGENT_TOOL_MESSAGE_CHARS,
): string => {
  const s = content ?? ''
  if (s.length <= max) return s
  return `${s.slice(0, max)}\n\n[truncated: ${s.length - max} chars omitted to stay within context budget]`
}

/** FRC：清理较早的 tool 消息内容（对齐 SUMMARIZE_TOOL_RESULTS Run时） */
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
  // 仍保留的 tool 消息也截断，避免单轮多 Read 撑爆上下文
  const kept = toolIndexes.slice(-keepRecentToolMessages)
  for (const idx of kept) {
    const m = messages[idx]
    if (m.role === 'tool' && m.content !== CLEARED_PLACEHOLDER) {
      m.content = capToolMessageContent(m.content)
    }
  }
  return cleared
}

/** 去掉没有对应 assistant.tool_calls 的 tool 消息，避免 OpenAI 400 */
export const dropOrphanToolMessages = (messages: AgentLoopMessage[]): AgentLoopMessage[] => {
  const out: AgentLoopMessage[] = []
  let pendingToolIds: Set<string> | null = null
  for (const m of messages) {
    if (m.role === 'system' || m.role === 'user') {
      out.push(m)
      continue
    }
    if (m.role === 'assistant') {
      out.push(m)
      pendingToolIds =
        m.toolCalls?.length && m.toolCalls.some((tc) => tc.id)
          ? new Set(m.toolCalls.map((tc) => tc.id).filter(Boolean))
          : null
      continue
    }
    if (m.role === 'tool') {
      if (pendingToolIds?.has(m.toolCallId)) {
        out.push(m)
        pendingToolIds.delete(m.toolCallId)
        if (pendingToolIds.size === 0) pendingToolIds = null
      }
    }
  }
  return out
}

export const estimateContextChars = (messages: AgentLoopMessage[]) => {
  let n = 0
  for (const m of messages) {
    if (m.role === 'system' || m.role === 'user' || m.role === 'assistant') {
      n += (m.content ?? '').length
      if (m.role === 'assistant' && m.reasoningContent) n += m.reasoningContent.length
    } else if (m.role === 'tool') {
      n += (m.content ?? '').length
    }
  }
  return n
}
