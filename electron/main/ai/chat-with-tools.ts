import type { AgentLoopMessage, AgentToolDef } from '../agent/agent-types'
import type { ModelEntry } from '../models-types'
import {
  beginAiMetricsCall,
  endAiMetricsCall,
  markAiMetricsFirstToken,
  tickAiMetricsStream,
  type AiMetricsSource,
} from '../ai-metrics-bridge'
import { traceModelCall, type AiTraceSource } from '../ai-trace-store'
import type { AiTraceContext } from './chat-with-provider'
import { estimateTokenUsage } from './parse-token-usage'
import { AGENT_TOOLS } from '../agent/agent-tool-defs'
import { isVisionUnsupportedApiError } from '../../../shared/ai/vision'
import { prepareAgentMessagesForVisionModel, visionUnsupportedError } from './ai-vision-guard'
import type { OpenAiStreamDelta } from './providers/openai'
import type { ReasoningEffortLevel } from '../../../shared/reasoning-effort'
import { getProviderAdapter } from './provider-registry'
import type { ChatWithToolsResult } from './provider-types'

export type { ChatWithToolsResult } from './provider-types'
export { chatOpenAiWithTools } from './adapters/openai-adapter'
export { chatAnthropicWithTools } from './adapters/anthropic-adapter'

const agentInputChars = (messages: AgentLoopMessage[]) =>
  messages.reduce((sum, m) => sum + (typeof m.content === 'string' ? m.content.length : 0), 0)

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
  reasoningEffort?: ReasoningEffortLevel,
): Promise<ChatWithToolsResult> => {
  const prepared = prepareAgentMessagesForVisionModel(model, messages)
  if (!prepared.ok) return prepared
  const wireMessages = prepared.messages
  const adapter = getProviderAdapter(model.provider)
  const metricsMeta = {
    modelId: model.id,
    modelName: model.name,
    provider: model.provider,
    source: metricsSource,
  }
  const startedAt = Date.now()
  const callId = beginAiMetricsCall(metricsMeta)
  const wrappedDelta =
    onDelta && adapter.capabilities.supportsSseStream
      ? (delta: OpenAiStreamDelta) => {
          markAiMetricsFirstToken(callId)
          tickAiMetricsStream(
            callId,
            (delta.content?.length ?? 0) + (delta.reasoning?.length ?? 0),
          )
          onDelta(delta)
        }
      : undefined
  let result: ChatWithToolsResult
  if (adapter.capabilities.requiresApiKey && !apiKey.trim()) {
    result = {
      ok: false,
      error: adapter.capabilities.missingApiKeyError ?? 'API Key required',
    }
  } else {
    result = await adapter.chatWithTools({
      model,
      apiKey,
      messages: wireMessages,
      onDelta: wrappedDelta,
      tools,
      abortSignal,
      apiModelId,
      reasoningEffort,
    })
    if (result.ok && !adapter.capabilities.supportsSseStream) {
      markAiMetricsFirstToken(callId)
    }
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
