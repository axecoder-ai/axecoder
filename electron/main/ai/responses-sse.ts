import type { AgentToolCall } from '../agent/agent-types'
import { resolveAgentToolName } from '../agent/agent-tool-aliases'

export type ResponsesStreamAccum = {
  content: string
  reasoningContent: string
  toolCalls: Map<string, { id: string; name: string; arguments: string }>
}

export const emptyResponsesStreamAccum = (): ResponsesStreamAccum => ({
  content: '',
  reasoningContent: '',
  toolCalls: new Map(),
})

/** 合并一条 Responses SSE 事件，返回本次新增片段 */
export const mergeResponsesStreamChunk = (
  accum: ResponsesStreamAccum,
  obj: Record<string, unknown>,
): { contentDelta: string; reasoningDelta: string } => {
  const prevContent = accum.content
  const prevReasoning = accum.reasoningContent
  const type = typeof obj.type === 'string' ? obj.type : ''

  if (type === 'response.output_text.delta' && typeof obj.delta === 'string') {
    accum.content += obj.delta
  } else if (
    (type === 'response.reasoning_summary_text.delta' ||
      type === 'response.reasoning.delta' ||
      type === 'response.reasoning_text.delta') &&
    typeof obj.delta === 'string'
  ) {
    accum.reasoningContent += obj.delta
  } else if (type === 'response.function_call_arguments.delta') {
    const callId = typeof obj.call_id === 'string' ? obj.call_id : ''
    if (callId) {
      let slot = accum.toolCalls.get(callId)
      if (!slot) {
        slot = { id: callId, name: '', arguments: '' }
        accum.toolCalls.set(callId, slot)
      }
      if (typeof obj.delta === 'string') slot.arguments += obj.delta
    }
  } else if (type === 'response.output_item.added') {
    const item = obj.item
    if (item && typeof item === 'object') {
      const row = item as Record<string, unknown>
      if (row.type === 'function_call') {
        const callId = String(row.call_id ?? '')
        if (callId) {
          accum.toolCalls.set(callId, {
            id: callId,
            name: String(row.name ?? ''),
            arguments: typeof row.arguments === 'string' ? row.arguments : '',
          })
        }
      }
    }
  } else if (type === 'response.output_item.done') {
    const item = obj.item
    if (item && typeof item === 'object') {
      const row = item as Record<string, unknown>
      if (row.type === 'function_call') {
        const callId = String(row.call_id ?? '')
        if (callId) {
          accum.toolCalls.set(callId, {
            id: callId,
            name: String(row.name ?? ''),
            arguments: typeof row.arguments === 'string' ? row.arguments : '',
          })
        }
      }
    }
  }

  return {
    contentDelta: accum.content.slice(prevContent.length),
    reasoningDelta: accum.reasoningContent.slice(prevReasoning.length),
  }
}

export const responsesStreamAccumToToolCalls = (
  accum: ResponsesStreamAccum,
): AgentToolCall[] => {
  const out: AgentToolCall[] = []
  for (const slot of accum.toolCalls.values()) {
    if (!slot.name) continue
    let args: Record<string, unknown> = {}
    try {
      args = JSON.parse(slot.arguments || '{}') as Record<string, unknown>
    } catch {
      args = {}
    }
    out.push({
      id: slot.id,
      name: (resolveAgentToolName(slot.name) ?? slot.name) as AgentToolCall['name'],
      arguments: args,
    })
  }
  return out
}

export const responsesStreamAccumToParts = (accum: ResponsesStreamAccum) => {
  const toolCalls = responsesStreamAccumToToolCalls(accum)
  const content = accum.content
  const reasoningContent = accum.reasoningContent.trim() || undefined
  const displayText = content.trim() || reasoningContent || ''
  return { content, reasoningContent, toolCalls, displayText }
}

/** 从 response.completed 事件提取 output（若有） */
export const outputFromCompletedEvent = (obj: Record<string, unknown>): unknown[] | undefined => {
  if (obj.type !== 'response.completed') return undefined
  const response = obj.response
  if (!response || typeof response !== 'object') return undefined
  const output = (response as Record<string, unknown>).output
  return Array.isArray(output) ? output : undefined
}
