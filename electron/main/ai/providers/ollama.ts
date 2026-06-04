import type { AiChatMessage } from '../../models-types'
import { userMessageToOllamaRow } from '../ai-message-images'
import { AI_REQUEST_TIMEOUT_MS, formatAiFetchError } from '../request-timeout'

export const buildOllamaChatUrl = (baseUrl: string): string => {
  const base = baseUrl.trim().replace(/\/+$/, '')
  return `${base}/api/chat`
}

export const chatOllama = async (
  baseUrl: string,
  modelId: string,
  apiKey: string,
  messages: AiChatMessage[],
): Promise<
  | { ok: true; text: string; content: string; reasoningContent?: string }
  | { ok: false; error: string }
> => {
  const url = buildOllamaChatUrl(baseUrl)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey.trim()) headers.Authorization = `Bearer ${apiKey.trim()}`
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: modelId,
        messages: messages.map((m) => {
          if (m.role === 'user' && m.images?.length) {
            return userMessageToOllamaRow(m.content, m.images)
          }
          return { role: m.role, content: m.content }
        }),
        stream: false,
      }),
      signal: AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS),
    })
    if (!res.ok) {
      const errText = await res.text()
      return { ok: false, error: `request failed (${res.status}): ${errText.slice(0, 300)}` }
    }
    const data = (await res.json()) as { message?: { content?: string } }
    const text = data.message?.content ?? ''
    return { ok: true, text, content: text }
  } catch (e) {
    return { ok: false, error: formatAiFetchError(e) }
  }
}
