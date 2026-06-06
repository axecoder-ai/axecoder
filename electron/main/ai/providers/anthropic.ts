import type { AiChatMessage, AiTokenUsage } from '../../models-types'
import { userMessageToAnthropicContent } from '../ai-message-images'
import { fetchAiWithRetry, formatAiRequestFailedError } from '../ai-request-retry'
import { AI_REQUEST_TIMEOUT_MS, formatAiFetchError } from '../request-timeout'

export const buildAnthropicMessagesUrl = (baseUrl: string): string => {
  const base = baseUrl.trim().replace(/\/+$/, '')
  return `${base}/v1/messages`
}

const toAnthropicMessages = (messages: AiChatMessage[]) => {
  const out: { role: 'user' | 'assistant'; content: string | Record<string, unknown>[] }[] = []
  for (const m of messages) {
    if (m.role === 'system') continue
    const content =
      m.role === 'user' && m.images?.length
        ? userMessageToAnthropicContent(m.content, m.images)
        : m.content
    out.push({ role: m.role, content })
  }
  return out
}

export const chatAnthropic = async (
  baseUrl: string,
  modelId: string,
  apiKey: string,
  messages: AiChatMessage[],
): Promise<
  | { ok: true; text: string; content: string; reasoningContent?: string; usage?: AiTokenUsage }
  | { ok: false; error: string }
> => {
  if (!apiKey.trim()) return { ok: false, error: 'Anthropic requires an API Key' }
  const url = buildAnthropicMessagesUrl(baseUrl)
  try {
    const { res, meta } = await fetchAiWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: modelId,
        max_tokens: 4096,
        messages: toAnthropicMessages(messages),
      }),
      signal: AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS),
    })
    if (!res.ok) {
      const errText = await res.text()
      return { ok: false, error: formatAiRequestFailedError(res.status, errText, meta) }
    }
    const data = (await res.json()) as {
      content?: { type: string; text?: string }[]
      usage?: { input_tokens?: number; output_tokens?: number }
    }
    const block = data.content?.find((c) => c.type === 'text')
    const text = block?.text ?? ''
    const usage: AiTokenUsage | undefined =
      data.usage &&
      (typeof data.usage.input_tokens === 'number' || typeof data.usage.output_tokens === 'number')
        ? {
            promptTokens: data.usage.input_tokens ?? 0,
            completionTokens: data.usage.output_tokens ?? 0,
            estimated: false,
          }
        : undefined
    return { ok: true, text, content: text, usage }
  } catch (e) {
    return { ok: false, error: formatAiFetchError(e) }
  }
}
