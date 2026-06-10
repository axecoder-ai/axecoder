import type { AiChatMessage, AiChatResult, ModelEntry } from '../models-types'
import {
  beginAiMetricsCall,
  endAiMetricsCall,
  markAiMetricsFirstToken,
  type AiMetricsSource,
} from '../ai-metrics-store'
import { traceModelCall, type AiTraceSource } from '../ai-trace-store'

export type AiTraceContext = { sessionId?: string; turn?: number }
import type { OpenAiStreamDelta } from './providers/openai'
import { normalizeAiChatResult, prepareMessagesForVisionModel } from './ai-vision-guard'
import { estimateTokenUsage } from './parse-token-usage'
import type { ReasoningEffortLevel } from '../../../shared/reasoning-effort'
import { getProviderAdapter } from './provider-registry'

const messageInputChars = (messages: AiChatMessage[]) =>
  messages.reduce((sum, m) => sum + (m.content?.length ?? 0), 0)

export const chatWithProvider = async (
  model: ModelEntry,
  apiKey: string,
  messages: AiChatMessage[],
  onDelta?: (delta: OpenAiStreamDelta) => void,
  apiModelId?: string,
  metricsSource: AiMetricsSource = 'other',
  traceContext?: AiTraceContext,
  reasoningEffort?: ReasoningEffortLevel,
): Promise<AiChatResult> => {
  if (!model.enabled) return { ok: false, error: 'Model is disabled' }
  const prepared = prepareMessagesForVisionModel(model, messages)
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
          onDelta(delta)
        }
      : undefined
  let result: AiChatResult
  if (adapter.capabilities.requiresApiKey && !apiKey.trim()) {
    result = {
      ok: false,
      error: adapter.capabilities.missingApiKeyError ?? 'API Key required',
    }
  } else {
    result = await adapter.chat({
      model,
      apiKey,
      messages: wireMessages,
      onDelta: wrappedDelta,
      apiModelId,
      reasoningEffort,
    })
    if (result.ok && !adapter.capabilities.supportsSseStream) {
      markAiMetricsFirstToken(callId)
    }
  }
  const normalized = normalizeAiChatResult(model, result)
  const usage = normalized.ok
    ? (normalized.usage ?? estimateTokenUsage(messageInputChars(wireMessages), normalized.text.length))
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
        }
      : { ok: false, error: normalized.error },
    durationMs: Date.now() - startedAt,
  })
  return normalized
}
