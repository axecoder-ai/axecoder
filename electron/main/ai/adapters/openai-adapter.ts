import type { AgentLoopMessage, AgentToolCall, AgentToolDef } from '../../agent/agent-types'
import type { AiTokenUsage, ModelEntry } from '../../models-types'
import { resolveAgentToolName } from '../../agent/agent-tool-aliases'
import { AGENT_TOOLS } from '../../agent/agent-tool-defs'
import { fetchAiWithRetry, formatAiRequestFailedError } from '../ai-request-retry'
import { AI_REQUEST_TIMEOUT_MS, formatAiFetchError } from '../request-timeout'
import { agentLoopToOpenAiWire, parseOpenAiAssistantParts } from '../openai-messages'
import {
  consumeOpenAiSse,
  emptyOpenAiStreamAccum,
  mergeOpenAiStreamChunk,
  openAiStreamAccumToMessage,
} from '../openai-sse'
import { parseOpenAiUsage } from '../parse-token-usage'
import { reasoningEffortForApi } from '../../../../shared/reasoning-effort'
import { PROVIDER_CAPABILITIES } from '../../../../shared/ai/provider-capabilities'
import type { AiProviderAdapter, PlainChatParams, ToolsChatParams } from '../provider-types'
import { buildOpenAiChatUrl, chatOpenAi, type OpenAiStreamDelta } from '../providers/openai'

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
  reasoningEffort?: import('../../../../shared/reasoning-effort').ReasoningEffortLevel,
) => {
  const effortApi = reasoningEffortForApi(reasoningEffort ?? 'auto')
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
        ...(effortApi ? { reasoning_effort: effortApi } : {}),
      }),
      signal: mergeAbortSignal(abortSignal),
    })
    if (!res.ok) {
      const errText = await res.text()
      return { ok: false as const, error: formatAiRequestFailedError(res.status, errText, meta) }
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
      ok: true as const,
      text: parts.displayText,
      content: parts.content,
      reasoningContent: parts.reasoningContent,
      toolCalls,
      usage,
    }
  } catch (e) {
    return { ok: false as const, error: formatAiFetchError(e) }
  }
}

export const openAiAdapter: AiProviderAdapter = {
  id: 'openai',
  capabilities: PROVIDER_CAPABILITIES.openai,
  chat: async ({ model, apiKey, messages, onDelta, apiModelId, reasoningEffort }) =>
    chatOpenAi(
      model.baseUrl,
      (apiModelId?.trim() || model.modelId).trim(),
      apiKey,
      messages,
      onDelta,
      reasoningEffortForApi(reasoningEffort ?? 'auto'),
    ),
  chatWithTools: async ({
    model,
    apiKey,
    messages,
    onDelta,
    tools,
    abortSignal,
    apiModelId,
    reasoningEffort,
  }) =>
    chatOpenAiWithTools(model, apiKey, messages, onDelta, tools, abortSignal, apiModelId, reasoningEffort),
}
