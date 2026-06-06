import type { AgentLoopMessage, AgentToolCall, AgentToolDef } from '../agent/agent-types'
import type { AiTokenUsage, ModelEntry } from '../models-types'
import {
  beginAiMetricsCall,
  endAiMetricsCall,
  markAiMetricsFirstToken,
  type AiMetricsSource,
} from '../ai-metrics-store'
import { traceModelCall, type AiTraceSource } from '../ai-trace-store'
import type { AiTraceContext } from './chat-with-provider'
import { estimateTokenUsage, parseOpenAiUsage } from './parse-token-usage'
import { resolveAgentToolName } from '../agent/agent-tool-aliases'
import { AGENT_TOOLS } from '../agent/agent-tool-defs'
import { buildOpenAiChatUrl } from './providers/openai'
import { buildAnthropicMessagesUrl } from './providers/anthropic'
import { fetchAiWithRetry, formatAiRequestFailedError } from './ai-request-retry'
import { AI_REQUEST_TIMEOUT_MS, formatAiFetchError } from './request-timeout'
import { isVisionUnsupportedApiError } from '../../../shared/ai/vision'
import { prepareAgentMessagesForVisionModel, visionUnsupportedError } from './ai-vision-guard'
import { userMessageToAnthropicContent } from './ai-message-images'
import { agentLoopToOpenAiWire, parseOpenAiAssistantParts } from './openai-messages'
import {
  consumeOpenAiSse,
  emptyOpenAiStreamAccum,
  mergeOpenAiStreamChunk,
  openAiStreamAccumToMessage,
} from './openai-sse'
import type { OpenAiStreamDelta } from './providers/openai'

export type ChatWithToolsResult =
  | {
      ok: true
      text: string
      content: string
      reasoningContent?: string
      toolCalls: AgentToolCall[]
      usage?: AiTokenUsage
    }
  | { ok: false; error: string }

const agentInputChars = (messages: AgentLoopMessage[]) =>
  messages.reduce((sum, m) => sum + (typeof m.content === 'string' ? m.content.length : 0), 0)

const openAiTools = (tools: readonly AgentToolDef[]) =>
  tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }))

const parseOpenAiToolCalls = (message: Record<string, unknown>): AgentToolCall[] => {
  const raw = message.tool_calls
  if (!Array.isArray(raw)) return []
  const out: AgentToolCall[] = []
  for (const item of raw) {
    const row = item as Record<string, unknown>
    const fn = row.function as Record<string, unknown> | undefined
    if (!fn || typeof fn.name !== 'string') continue
    let args: Record<string, unknown> = {}
    try {
      args = JSON.parse(String(fn.arguments ?? '{}')) as Record<string, unknown>
    } catch {
      args = {}
    }
    out.push({
      id: String(row.id ?? ''),
      name: (resolveAgentToolName(fn.name) ?? fn.name) as AgentToolCall['name'],
      arguments: args,
    })
  }
  return out
}

const mergeAbortSignal = (userSignal?: AbortSignal) => {
  const timeout = AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS)
  if (!userSignal) return timeout
  return AbortSignal.any([timeout, userSignal])
}

export const chatOpenAiWithTools = async (
  model: ModelEntry,
  apiKey: string,
  messages: AgentLoopMessage[],
  onDelta?: (delta: OpenAiStreamDelta) => void,
  tools: readonly AgentToolDef[] = AGENT_TOOLS,
  abortSignal?: AbortSignal,
  apiModelId?: string,
): Promise<ChatWithToolsResult> => {
  const url = buildOpenAiChatUrl(model.baseUrl)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey.trim()) headers.Authorization = `Bearer ${apiKey.trim()}`
  const useStream = !!onDelta
  try {
    const { res, meta } = await fetchAiWithRetry(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: (apiModelId?.trim() || model.modelId).trim(),
        messages: agentLoopToOpenAiWire(messages),
        tools: openAiTools(tools),
        tool_choice: 'auto',
        stream: useStream,
      }),
      signal: mergeAbortSignal(abortSignal),
    })
    if (!res.ok) {
      const errText = await res.text()
      return { ok: false, error: formatAiRequestFailedError(res.status, errText, meta) }
    }
    let message: Record<string, unknown>
    let usage: AiTokenUsage | undefined
    if (useStream) {
      const accum = emptyOpenAiStreamAccum()
      await consumeOpenAiSse(res, (obj) => {
        const u = parseOpenAiUsage(obj)
        if (u) usage = u
        const { contentDelta, reasoningDelta } = mergeOpenAiStreamChunk(accum, obj)
        if (contentDelta) onDelta!({ content: contentDelta })
        if (reasoningDelta) onDelta!({ reasoning: reasoningDelta })
      })
      message = openAiStreamAccumToMessage(accum)
    } else {
      const data = (await res.json()) as {
        choices?: { message?: Record<string, unknown> }[]
        usage?: Record<string, unknown>
      }
      message = data.choices?.[0]?.message ?? {}
      usage = data.usage ? parseOpenAiUsage({ usage: data.usage }) : undefined
    }
    const parts = parseOpenAiAssistantParts(message)
    const toolCalls = parseOpenAiToolCalls(message)
    return {
      ok: true,
      text: parts.displayText,
      content: parts.content,
      reasoningContent: parts.reasoningContent,
      toolCalls,
      usage,
    }
  } catch (e) {
    return { ok: false, error: formatAiFetchError(e) }
  }
}

const anthropicTools = (tools: readonly AgentToolDef[]) =>
  tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }))

const toAnthropicMessages = (messages: AgentLoopMessage[]) => {
  const out: { role: 'user' | 'assistant'; content: unknown }[] = []
  let i = 0
  while (i < messages.length) {
    const m = messages[i]
    if (m.role === 'system') {
      i += 1
      continue
    }
    if (m.role === 'user') {
      const content =
        m.images?.length
          ? userMessageToAnthropicContent(m.content, m.images)
          : m.content
      out.push({ role: 'user', content })
      i += 1
      continue
    }
    if (m.role === 'assistant') {
      if (m.toolCalls?.length) {
        const blocks: unknown[] = []
        if (m.content) blocks.push({ type: 'text', text: m.content })
        for (const tc of m.toolCalls) {
          blocks.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.name,
            input: tc.arguments,
          })
        }
        out.push({ role: 'assistant', content: blocks })
      } else {
        out.push({ role: 'assistant', content: m.content })
      }
      i += 1
      continue
    }
    if (m.role === 'tool') {
      const results: unknown[] = []
      while (i < messages.length && messages[i].role === 'tool') {
        const t = messages[i] as Extract<AgentLoopMessage, { role: 'tool' }>
        results.push({
          type: 'tool_result',
          tool_use_id: t.toolCallId,
          content: t.content,
        })
        i += 1
      }
      out.push({ role: 'user', content: results })
      continue
    }
    i += 1
  }
  return out
}

export const chatAnthropicWithTools = async (
  model: ModelEntry,
  apiKey: string,
  messages: AgentLoopMessage[],
  tools: readonly AgentToolDef[] = AGENT_TOOLS,
  abortSignal?: AbortSignal,
  apiModelId?: string,
): Promise<ChatWithToolsResult> => {
  if (!apiKey.trim()) return { ok: false, error: 'Anthropic requires an API Key' }
  const system = messages.find((m) => m.role === 'system')?.content ?? ''
  const url = buildAnthropicMessagesUrl(model.baseUrl)
  try {
    const { res, meta } = await fetchAiWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: (apiModelId?.trim() || model.modelId).trim(),
        max_tokens: 4096,
        system,
        messages: toAnthropicMessages(messages),
        tools: anthropicTools(tools),
      }),
      signal: mergeAbortSignal(abortSignal),
    })
    if (!res.ok) {
      const errText = await res.text()
      return { ok: false, error: formatAiRequestFailedError(res.status, errText, meta) }
    }
    const data = (await res.json()) as {
      content?: { type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }[]
      usage?: { input_tokens?: number; output_tokens?: number }
    }
    const blocks = data.content ?? []
    let text = ''
    const toolCalls: AgentToolCall[] = []
    for (const b of blocks) {
      if (b.type === 'text' && b.text) text += b.text
      if (b.type === 'tool_use' && b.id && b.name) {
        toolCalls.push({
          id: b.id,
          name: (resolveAgentToolName(b.name) ?? b.name) as AgentToolCall['name'],
          arguments: b.input ?? {},
        })
      }
    }
    const usage: AiTokenUsage | undefined =
      data.usage &&
      (typeof data.usage.input_tokens === 'number' || typeof data.usage.output_tokens === 'number')
        ? {
            promptTokens: data.usage.input_tokens ?? 0,
            completionTokens: data.usage.output_tokens ?? 0,
            estimated: false,
          }
        : undefined
    return { ok: true, text, content: text, toolCalls, usage }
  } catch (e) {
    return { ok: false, error: formatAiFetchError(e) }
  }
}

const normalizeToolsResult = (model: ModelEntry, result: ChatWithToolsResult): ChatWithToolsResult => {
  if (result.ok) return result
  if (isVisionUnsupportedApiError(result.error)) {
    return { ok: false, error: visionUnsupportedError(model) }
  }
  return result
}

export const chatWithToolsForModel = async (
  model: ModelEntry,
  apiKey: string,
  messages: AgentLoopMessage[],
  onDelta?: (delta: OpenAiStreamDelta) => void,
  tools: readonly AgentToolDef[] = AGENT_TOOLS,
  abortSignal?: AbortSignal,
  apiModelId?: string,
  metricsSource: AiMetricsSource = 'agent',
  traceContext?: AiTraceContext,
): Promise<ChatWithToolsResult> => {
  const prepared = prepareAgentMessagesForVisionModel(model, messages)
  if (!prepared.ok) return prepared
  const wireMessages = prepared.messages
  const metricsMeta = {
    modelId: model.id,
    modelName: model.name,
    provider: model.provider,
    source: metricsSource,
  }
  const startedAt = Date.now()
  const callId = beginAiMetricsCall(metricsMeta)
  const wrappedDelta = onDelta
    ? (delta: OpenAiStreamDelta) => {
        markAiMetricsFirstToken(callId)
        onDelta(delta)
      }
    : undefined
  let result: ChatWithToolsResult
  if (model.provider === 'ollama' || model.provider === 'openai') {
    if (model.provider === 'openai' && !apiKey.trim()) {
      result = { ok: false, error: 'OpenAI-compatible API requires an API Key' }
    } else {
      result = await chatOpenAiWithTools(
        model,
        apiKey,
        wireMessages,
        wrappedDelta,
        tools,
        abortSignal,
        apiModelId,
      )
    }
  } else {
    result = await chatAnthropicWithTools(
      model,
      apiKey,
      wireMessages,
      tools,
      abortSignal,
      apiModelId,
    )
    if (result.ok) markAiMetricsFirstToken(callId)
  }
  const normalized = normalizeToolsResult(model, result)
  const usage = normalized.ok
    ? (normalized.usage ?? estimateTokenUsage(agentInputChars(wireMessages), normalized.text.length))
    : undefined
  endAiMetricsCall(
    callId,
    {
      ok: normalized.ok,
      error: !normalized.ok ? normalized.error : undefined,
      outputChars: normalized.ok ? normalized.text.length : 0,
      inputTokens: usage?.promptTokens,
      outputTokens: usage?.completionTokens,
      tokensEstimated: usage?.estimated,
    },
    metricsMeta,
  )
  traceModelCall({
    source: metricsSource as AiTraceSource,
    sessionId: traceContext?.sessionId,
    turn: traceContext?.turn,
    modelId: model.id,
    modelName: model.name,
    provider: model.provider,
    requestMessages: wireMessages,
    result: normalized.ok
      ? {
          ok: true,
          text: normalized.text,
          content: normalized.content,
          reasoningContent: normalized.reasoningContent,
          toolCalls: normalized.toolCalls,
        }
      : { ok: false, error: normalized.error },
    durationMs: Date.now() - startedAt,
  })
  return normalized
}
