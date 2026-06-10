import type { AiChatMessage } from '../models-types'
import type { AgentLoopMessage, AgentToolCall } from '../agent/agent-types'
import { resolveAgentToolName } from '../agent/agent-tool-aliases'

export type ParsedResponsesOutput = {
  content: string
  reasoningContent?: string
  toolCalls: AgentToolCall[]
  displayText: string
}

const textContent = (text: string) => [{ type: 'input_text', text }]

const outputTextContent = (text: string) => [{ type: 'output_text', text }]

export const aiChatToResponsesInput = (messages: AiChatMessage[]): unknown[] => {
  const out: unknown[] = []
  for (const m of messages) {
    if (m.role === 'system') {
      out.push({ type: 'message', role: 'developer', content: textContent(m.content) })
      continue
    }
    if (m.role === 'user') {
      out.push({ type: 'message', role: 'user', content: textContent(m.content) })
      continue
    }
    if (m.role === 'assistant') {
      if (m.content.trim()) {
        out.push({ type: 'message', role: 'assistant', content: outputTextContent(m.content) })
      }
      if (m.reasoningContent?.trim()) {
        out.push({
          type: 'reasoning',
          summary: [{ type: 'summary_text', text: m.reasoningContent }],
        })
      }
    }
  }
  return out
}

export const agentLoopToResponsesInput = (messages: AgentLoopMessage[]): unknown[] => {
  const out: unknown[] = []
  for (const m of messages) {
    if (m.role === 'system') {
      out.push({ type: 'message', role: 'developer', content: textContent(m.content) })
    } else if (m.role === 'user') {
      out.push({ type: 'message', role: 'user', content: textContent(m.content) })
    } else if (m.role === 'assistant') {
      if (m.content?.trim()) {
        out.push({ type: 'message', role: 'assistant', content: outputTextContent(m.content) })
      }
      if (m.reasoningContent?.trim()) {
        out.push({
          type: 'reasoning',
          summary: [{ type: 'summary_text', text: m.reasoningContent }],
        })
      }
      for (const tc of m.toolCalls ?? []) {
        out.push({
          type: 'function_call',
          call_id: tc.id,
          name: tc.name,
          arguments: JSON.stringify(tc.arguments ?? {}),
        })
      }
    } else if (m.role === 'tool') {
      out.push({
        type: 'function_call_output',
        call_id: m.toolCallId,
        output: m.content,
      })
    }
  }
  return out
}

const parseMessageOutputText = (row: Record<string, unknown>): string => {
  const content = row.content
  if (!Array.isArray(content)) return ''
  let text = ''
  for (const part of content) {
    if (!part || typeof part !== 'object') continue
    const p = part as Record<string, unknown>
    if (p.type === 'output_text' && typeof p.text === 'string') text += p.text
  }
  return text
}

const parseReasoningText = (row: Record<string, unknown>): string => {
  const summary = row.summary
  if (Array.isArray(summary)) {
    let text = ''
    for (const part of summary) {
      if (!part || typeof part !== 'object') continue
      const p = part as Record<string, unknown>
      if (p.type === 'summary_text' && typeof p.text === 'string') text += p.text
    }
    if (text) return text
  }
  if (typeof row.text === 'string') return row.text
  return ''
}

export const parseResponsesOutput = (output: unknown[] | undefined): ParsedResponsesOutput => {
  let content = ''
  let reasoningContent = ''
  const toolCalls: AgentToolCall[] = []
  for (const item of output ?? []) {
    if (!item || typeof item !== 'object') continue
    const row = item as Record<string, unknown>
    if (row.type === 'message') {
      content += parseMessageOutputText(row)
    } else if (row.type === 'reasoning') {
      reasoningContent += parseReasoningText(row)
    } else if (row.type === 'function_call') {
      const name = String(row.name ?? '')
      let args: Record<string, unknown> = {}
      try {
        args = JSON.parse(String(row.arguments ?? '{}')) as Record<string, unknown>
      } catch {
        args = {}
      }
      toolCalls.push({
        id: String(row.call_id ?? ''),
        name: (resolveAgentToolName(name) ?? name) as AgentToolCall['name'],
        arguments: args,
      })
    }
  }
  const displayText = content.trim() || reasoningContent.trim()
  return {
    content,
    reasoningContent: reasoningContent.trim() || undefined,
    toolCalls,
    displayText,
  }
}
