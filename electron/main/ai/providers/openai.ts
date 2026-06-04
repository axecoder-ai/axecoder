import type { AiChatMessage } from '../../models-types'
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
): Promise<
  | { ok: true; text: string; content: string; reasoningContent?: string }
  | { ok: false; error: string }
> => {
  const url = buildOpenAiChatUrl(baseUrl)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey.trim()) headers.Authorization = `Bearer ${apiKey.trim()}`
  const useStream = !!onDelta
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelId,
        messages: aiChatToOpenAiWire(messages),
        stream: useStream,
      }),
      signal: AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS),
    })
    if (!res.ok) {
      const errText = await res.text()
      return { ok: false, error: `request failed (${res.status}): ${errText.slice(0, 300)}` }
    }
    if (useStream) {
      const accum = emptyOpenAiStreamAccum()
      await consumeOpenAiSse(res, (obj) => {
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
      }
    }
    const data = (await res.json()) as { choices?: { message?: Record<string, unknown> }[] }
    const parts = parseOpenAiAssistantParts(data.choices?.[0]?.message)
    return { ok: true, text: parts.displayText, content: parts.content, reasoningContent: parts.reasoningContent }
  } catch (e) {
    return { ok: false, error: formatAiFetchError(e) }
  }
}
