import type { AiChatMessage } from '../../models-types'
import { AI_REQUEST_TIMEOUT_MS, formatAiFetchError } from '../request-timeout'
import { aiChatToOpenAiWire, parseOpenAiAssistantParts } from '../openai-messages'

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
): Promise<
  | { ok: true; text: string; content: string; reasoningContent?: string }
  | { ok: false; error: string }
> => {
  const url = buildOpenAiChatUrl(baseUrl)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey.trim()) headers.Authorization = `Bearer ${apiKey.trim()}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: modelId, messages: aiChatToOpenAiWire(messages), stream: false }),
      signal: AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS),
    })
    if (!res.ok) {
      const errText = await res.text()
      return { ok: false, error: `请求失败 (${res.status}): ${errText.slice(0, 300)}` }
    }
    const data = (await res.json()) as { choices?: { message?: Record<string, unknown> }[] }
    const parts = parseOpenAiAssistantParts(data.choices?.[0]?.message)
    return { ok: true, text: parts.displayText, content: parts.content, reasoningContent: parts.reasoningContent }
  } catch (e) {
    return { ok: false, error: formatAiFetchError(e) }
  }
}
