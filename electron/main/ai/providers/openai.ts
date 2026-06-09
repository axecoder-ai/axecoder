import type { AiChatMessage, AiTokenUsage } from '../../models-types'
import { parseOpenAiUsage } from '../parse-token-usage'
import { fetchAiWithRetry, formatAiRequestFailedError } from '../ai-request-retry'
import { AI_REQUEST_TIMEOUT_MS, formatAiFetchError } from '../request-timeout'
import { aiChatToOpenAiWire, parseOpenAiAssistantParts } from '../openai-messages'
import {
  consumeOpenAiSse,
  emptyOpenAiStreamAccum,
  mergeOpenAiStreamChunk,
  openAiStreamAccumToMessage,
} from '../openai-sse'

export type OpenAiStreamDelta = { content?: string; reasoning?: string }

export const buildOpenAiChatUrl = (baseUrl: string): string => {
  let base = baseUrl.trim().replace(/\/+$/, '')
  if (!base.endsWith('/v1')) base += '/v1'
  return `${base}/chat/completions`
}

export const chatOpenAi = async (
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
  const url = buildOpenAiChatUrl(baseUrl)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey.trim()) headers.Authorization = `Bearer ${apiKey.trim()}`
  const useStream = !!onDelta
  try {
    const { res, meta } = await fetchAiWithRetry(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelId,
        messages: aiChatToOpenAiWire(messages),
        stream: useStream,
        ...(reasoningEffort ? { reasoning_effort: reasoningEffort } : {}),
      }),
      signal: AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS),
    })
    if (!res.ok) {
      const errText = await res.text()
      return { ok: false, error: formatAiRequestFailedError(res.status, errText, meta) }
    }
    if (useStream) {
      const accum = emptyOpenAiStreamAccum()
      let usage: AiTokenUsage | undefined
      await consumeOpenAiSse(res, (obj) => {
        const u = parseOpenAiUsage(obj)
        if (u) usage = u
        const { contentDelta, reasoningDelta } = mergeOpenAiStreamChunk(accum, obj)
        if (contentDelta) onDelta!({ content: contentDelta })
        if (reasoningDelta) onDelta!({ reasoning: reasoningDelta })
      })
      const parts = parseOpenAiAssistantParts(openAiStreamAccumToMessage(accum))
      return {
        ok: true,
        text: parts.displayText,
        content: parts.content,
        reasoningContent: parts.reasoningContent,
        usage,
      }
    }
    const data = (await res.json()) as {
      choices?: { message?: Record<string, unknown> }[]
      usage?: Record<string, unknown>
    }
    const parts = parseOpenAiAssistantParts(data.choices?.[0]?.message)
    const usage = data.usage ? parseOpenAiUsage({ usage: data.usage }) : undefined
    return {
      ok: true,
      text: parts.displayText,
      content: parts.content,
      reasoningContent: parts.reasoningContent,
      usage,
    }
  } catch (e) {
    return { ok: false, error: formatAiFetchError(e) }
  }
}
