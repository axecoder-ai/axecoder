import type { AiChatMessage } from '../models-types'
import type { AgentLoopMessage } from '../agent/agent-types'
import { userMessageToOpenAiContent } from './ai-message-images'
import { pickOpenAiReplyText } from './openai-reply'

export type OpenAiAssistantParts = {
  content: string
  reasoningContent?: string
  displayText: string
}

export const pickOpenAiContent = (message: Record<string, unknown> | undefined): string => {
  const c = message?.content
  return typeof c === 'string' ? c : ''
}

export const pickOpenAiReasoningContent = (
  message: Record<string, unknown> | undefined,
): string | undefined => {
  const r = message?.reasoning_content
  if (typeof r !== 'string' || !r.trim()) return undefined
  return r
}

export const parseOpenAiAssistantParts = (
  message: Record<string, unknown> | undefined,
): OpenAiAssistantParts => {
  const content = pickOpenAiContent(message)
  const reasoningContent = pickOpenAiReasoningContent(message)
  const displayText = pickOpenAiReplyText(message)
  return { content, reasoningContent, displayText }
}

export const aiChatToOpenAiWire = (messages: AiChatMessage[]): Record<string, unknown>[] =>
  messages.map((m) => {
    const content =
      m.role === 'user' && m.images?.length
        ? userMessageToOpenAiContent(m.content, m.images)
        : m.content
    const row: Record<string, unknown> = { role: m.role, content }
    if (m.role === 'assistant' && m.reasoningContent) {
      row.reasoning_content = m.reasoningContent
    }
    return row
  })

export const agentLoopToOpenAiWire = (messages: AgentLoopMessage[]): Record<string, unknown>[] => {
  const out: Record<string, unknown>[] = []
  for (const m of messages) {
    if (m.role === 'system') {
      out.push({ role: m.role, content: m.content })
    } else if (m.role === 'user') {
      const content =
        m.images?.length ? userMessageToOpenAiContent(m.content, m.images) : m.content
      out.push({ role: 'user', content })
    } else if (m.role === 'assistant') {
      const row: Record<string, unknown> = { role: 'assistant', content: m.content ?? '' }
      if (m.reasoningContent) row.reasoning_content = m.reasoningContent
      if (m.toolCalls?.length) {
        row.tool_calls = m.toolCalls.map((tc) => ({
          id: tc.id,
          type: 'function',
          function: { name: tc.name, arguments: JSON.stringify(tc.arguments) },
        }))
      }
      out.push(row)
    } else if (m.role === 'tool') {
      out.push({ role: 'tool', tool_call_id: m.toolCallId, content: m.content })
    }
  }
  return out
}
