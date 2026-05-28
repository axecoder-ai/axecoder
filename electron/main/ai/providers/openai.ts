import type { AiChatMessage } from '../../models-types'

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
): Promise<{ ok: true; text: string } | { ok: false; error: string }> => {
  const url = buildOpenAiChatUrl(baseUrl)
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
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] }
  return { ok: true, text: data.choices?.[0]?.message?.content ?? '' }
}
