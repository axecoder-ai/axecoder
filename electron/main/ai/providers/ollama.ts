import type { AiChatMessage, AiTokenUsage } from '../../models-types'
import { userMessageToOllamaRow } from '../ai-message-images'
import { fetchAiWithRetry, formatAiRequestFailedError } from '../ai-request-retry'
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
  | { ok: true; text: string; content: string; reasoningContent?: string; usage?: AiTokenUsage }
  | { ok: false; error: string }
> => {
  const url = buildOllamaChatUrl(baseUrl)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey.trim()) headers.Authorization = `Bearer ${apiKey.trim()}`
  try {
    const { res, meta } = await fetchAiWithRetry(url, {
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
      return { ok: false, error: formatAiRequestFailedError(res.status, errText, meta) }
    }
    const data = (await res.json()) as {
      message?: { content?: string }
      prompt_eval_count?: number
      eval_count?: number
    }
    const text = data.message?.content ?? ''
    const usage: AiTokenUsage | undefined =
      typeof data.prompt_eval_count === 'number' || typeof data.eval_count === 'number'
        ? {
            promptTokens: data.prompt_eval_count ?? 0,
            completionTokens: data.eval_count ?? 0,
            estimated: false,
          }
        : undefined
    return { ok: true, text, content: text, usage }
  } catch (e) {
    return { ok: false, error: formatAiFetchError(e) }
  }
}
