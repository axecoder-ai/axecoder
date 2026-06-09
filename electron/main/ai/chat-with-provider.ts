import type { AiChatMessage, AiChatResult, ModelEntry } from '../models-types'
import {
  beginAiMetricsCall,
  endAiMetricsCall,
  markAiMetricsFirstToken,
  type AiMetricsSource,
} from '../ai-metrics-store'
import { traceModelCall, type AiTraceSource } from '../ai-trace-store'

export type AiTraceContext = { sessionId?: string; turn?: number }
import { chatOpenAi, type OpenAiStreamDelta } from './providers/openai'
import { chatOllama } from './providers/ollama'
import { chatAnthropic } from './providers/anthropic'
import { normalizeAiChatResult, prepareMessagesForVisionModel } from './ai-vision-guard'
import { estimateTokenUsage } from './parse-token-usage'
import { reasoningEffortForApi, type ReasoningEffortLevel } from '../../../shared/reasoning-effort'

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
  const apiName = (apiModelId?.trim() || model.modelId).trim()
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
  let result: AiChatResult
  if (model.provider === 'openai') {
    if (!apiKey.trim()) {
      result = { ok: false, error: 'OpenAI-compatible API requires an API Key' }
    } else {
      result = await chatOpenAi(
        model.baseUrl,
        apiName,
        apiKey,
        wireMessages,
        wrappedDelta,
        reasoningEffortForApi(reasoningEffort ?? 'auto'),
      )
    }
  } else if (model.provider === 'ollama') {
    result = await chatOllama(model.baseUrl, apiName, apiKey, wireMessages)
    if (result.ok) markAiMetricsFirstToken(callId)
  } else {
    result = await chatAnthropic(model.baseUrl, apiName, apiKey, wireMessages)
    if (result.ok) markAiMetricsFirstToken(callId)
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
