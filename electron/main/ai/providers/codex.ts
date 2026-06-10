import type { AiChatMessage, AiTokenUsage } from '../../models-types'
import type { AgentLoopMessage, AgentToolCall, AgentToolDef } from '../../agent/agent-types'
import { fetchAiWithRetry, formatAiRequestFailedError } from '../ai-request-retry'
import { AI_REQUEST_TIMEOUT_MS, formatAiFetchError } from '../request-timeout'
import { parseOpenAiUsage, parseResponsesUsage } from '../parse-token-usage'
import { consumeOpenAiSse } from '../openai-sse'
import {
  aiChatToResponsesInput,
  agentLoopToResponsesInput,
  parseResponsesOutput,
} from '../responses-messages'
import {
  emptyResponsesStreamAccum,
  mergeResponsesStreamChunk,
  outputFromCompletedEvent,
  responsesStreamAccumToParts,
} from '../responses-sse'
import type { OpenAiStreamDelta } from './openai'

export const buildCodexResponsesUrl = (baseUrl: string): string => {
  let base = baseUrl.trim().replace(/\/+$/, '')
  if (!base.endsWith('/v1')) base += '/v1'
  return `${base}/responses`
}

const codexTools = (tools: readonly AgentToolDef[]) =>
  tools.map((t) => ({
    type: 'function' as const,
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }))

const buildCodexBody = (
  modelId: string,
  input: unknown[],
  reasoningEffort?: string,
  tools?: readonly AgentToolDef[],
  stream?: boolean,
) => ({
  model: modelId,
  input,
  store: false,
  ...(stream ? { stream: true } : {}),
  ...(tools?.length
    ? { tools: codexTools(tools), tool_choice: 'auto' as const }
    : {}),
  ...(reasoningEffort ? { reasoning: { effort: reasoningEffort } } : {}),
})

export const chatCodex = async (
  baseUrl: string,
  modelId: string,
  apiKey: string,
  messages: AiChatMessage[],
  onDelta?: (delta: OpenAiStreamDelta) => void,
  reasoningEffort?: string,
): Promise<
  | { ok: true; text: string; content: string; reasoningContent?: string; usage?: AiTokenUsage }
  | { ok: false; error: string }
> => {
  const url = buildCodexResponsesUrl(baseUrl)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey.trim()) headers.Authorization = `Bearer ${apiKey.trim()}`
  const useStream = !!onDelta
  try {
    const { res, meta } = await fetchAiWithRetry(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(
        buildCodexBody(modelId, aiChatToResponsesInput(messages), reasoningEffort, undefined, useStream),
      ),
      signal: AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS),
    })
    if (!res.ok) {
      const errText = await res.text()
      return { ok: false, error: formatAiRequestFailedError(res.status, errText, meta) }
    }
    if (useStream) {
      const accum = emptyResponsesStreamAccum()
      let usage: AiTokenUsage | undefined
      await consumeOpenAiSse(res, (obj) => {
        const u = parseResponsesUsage(obj)
        if (u) usage = u
        const completedOutput = outputFromCompletedEvent(obj)
        if (completedOutput) {
          const parsed = parseResponsesOutput(completedOutput)
          if (parsed.content) accum.content = parsed.content
          if (parsed.reasoningContent) accum.reasoningContent = parsed.reasoningContent
        }
        const response = obj.response
        if (response && typeof response === 'object') {
          const u2 = parseResponsesUsage(response as Record<string, unknown>)
          if (u2) usage = u2
        }
        const { contentDelta, reasoningDelta } = mergeResponsesStreamChunk(accum, obj)
        if (contentDelta) onDelta!({ content: contentDelta })
        if (reasoningDelta) onDelta!({ reasoning: reasoningDelta })
      })
      const parts = responsesStreamAccumToParts(accum)
      return {
        ok: true,
        text: parts.displayText,
        content: parts.content,
        reasoningContent: parts.reasoningContent,
        usage,
      }
    }
    const data = (await res.json()) as {
      output?: unknown[]
      usage?: Record<string, unknown>
    }
    const parsed = parseResponsesOutput(data.output)
    const usage = data.usage ? parseResponsesUsage({ usage: data.usage }) : undefined
    return {
      ok: true,
      text: parsed.displayText,
      content: parsed.content,
      reasoningContent: parsed.reasoningContent,
      usage,
    }
  } catch (e) {
    return { ok: false, error: formatAiFetchError(e) }
  }
}

export const chatCodexWithTools = async (
  modelBaseUrl: string,
  modelId: string,
  apiKey: string,
  messages: AgentLoopMessage[],
  onDelta?: (delta: OpenAiStreamDelta) => void,
  tools: readonly AgentToolDef[] = [],
  abortSignal?: AbortSignal,
  reasoningEffort?: string,
): Promise<
  | {
      ok: true
      text: string
      content: string
      reasoningContent?: string
      toolCalls: AgentToolCall[]
      usage?: AiTokenUsage
    }
  | { ok: false; error: string }
> => {
  const url = buildCodexResponsesUrl(modelBaseUrl)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey.trim()) headers.Authorization = `Bearer ${apiKey.trim()}`
  const useStream = !!onDelta
  const signal = abortSignal
    ? AbortSignal.any([AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS), abortSignal])
    : AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS)
  try {
    const { res, meta } = await fetchAiWithRetry(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(
        buildCodexBody(
          modelId,
          agentLoopToResponsesInput(messages),
          reasoningEffort,
          tools,
          useStream,
        ),
      ),
      signal,
    })
    if (!res.ok) {
      const errText = await res.text()
      return { ok: false, error: formatAiRequestFailedError(res.status, errText, meta) }
    }
    if (useStream) {
      const accum = emptyResponsesStreamAccum()
      let usage: AiTokenUsage | undefined
      await consumeOpenAiSse(res, (obj) => {
        const u = parseResponsesUsage(obj)
        if (u) usage = u
        const completedOutput = outputFromCompletedEvent(obj)
        if (completedOutput) {
          const parsed = parseResponsesOutput(completedOutput)
          if (parsed.content) accum.content = parsed.content
          if (parsed.reasoningContent) accum.reasoningContent = parsed.reasoningContent
          for (const tc of parsed.toolCalls) {
            accum.toolCalls.set(tc.id, {
              id: tc.id,
              name: tc.name,
              arguments: JSON.stringify(tc.arguments),
            })
          }
        }
        const response = obj.response
        if (response && typeof response === 'object') {
          const u2 = parseResponsesUsage(response as Record<string, unknown>)
          if (u2) usage = u2
        }
        const { contentDelta, reasoningDelta } = mergeResponsesStreamChunk(accum, obj)
        if (contentDelta) onDelta!({ content: contentDelta })
        if (reasoningDelta) onDelta!({ reasoning: reasoningDelta })
      })
      const parts = responsesStreamAccumToParts(accum)
      return {
        ok: true,
        text: parts.displayText,
        content: parts.content,
        reasoningContent: parts.reasoningContent,
        toolCalls: parts.toolCalls,
        usage,
      }
    }
    const data = (await res.json()) as {
      output?: unknown[]
      usage?: Record<string, unknown>
    }
    const parsed = parseResponsesOutput(data.output)
    const usage = data.usage ? parseResponsesUsage({ usage: data.usage }) : undefined
    return {
      ok: true,
      text: parsed.displayText,
      content: parsed.content,
      reasoningContent: parsed.reasoningContent,
      toolCalls: parsed.toolCalls,
      usage,
    }
  } catch (e) {
    return { ok: false, error: formatAiFetchError(e) }
  }
}
