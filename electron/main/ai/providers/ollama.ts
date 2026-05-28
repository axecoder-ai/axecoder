import type { AiChatMessage } from '../../models-types'

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
  const res = await fetch(url, {
    method: 'POST',
    headers,
    body: JSON.stringify({ model: modelId, messages, stream: false }),
  })
  if (!res.ok) {
    const errText = await res.text()
    return { ok: false, error: `请求失败 (${res.status}): ${errText.slice(0, 300)}` }
  }
  const data = (await res.json()) as { message?: { content?: string } }
  const text = data.message?.content ?? ''
  return { ok: true, text, content: text }
}
