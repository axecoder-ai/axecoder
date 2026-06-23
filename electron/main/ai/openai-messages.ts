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
  if (typeof c === 'string') return c
  if (Array.isArray(c)) {
    const parts: string[] = []
    for (const part of c) {
      if (part && typeof part === 'object' && 'text' in part) {
        const t = (part as { text?: string }).text
        if (typeof t === 'string' && t.trim()) parts.push(t)
      }
    }
    if (parts.length) return parts.join('\n')
  }
  return ''
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
  const normalized = displayText.trim() || content.trim()
  return {
    content: content.trim() || normalized,
    reasoningContent,
    displayText: normalized,
  }
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
  let lastReasoningIdx = -1
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role === 'assistant' && m.reasoningContent?.trim()) {
      lastReasoningIdx = i
      break
    }
  }
  const out: Record<string, unknown>[] = []
  for (let i = 0; i < messages.length; i++) {
    const m = messages[i]
    if (m.role === 'system') {
      out.push({ role: m.role, content: m.content })
    } else if (m.role === 'user') {
      const content =
        m.images?.length ? userMessageToOpenAiContent(m.content, m.images) : m.content
      out.push({ role: 'user', content })
    } else if (m.role === 'assistant') {
      const row: Record<string, unknown> = { role: 'assistant', content: m.content ?? '' }
      if (lastReasoningIdx === i && m.reasoningContent) row.reasoning_content = m.reasoningContent
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
