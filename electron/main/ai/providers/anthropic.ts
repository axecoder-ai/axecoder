import type { AiChatMessage } from '../../models-types'

export const buildAnthropicMessagesUrl = (baseUrl: string): string => {
  const base = baseUrl.trim().replace(/\/+$/, '')
  return `${base}/v1/messages`
}

const toAnthropicMessages = (messages: AiChatMessage[]) => {
  const out: { role: 'user' | 'assistant'; content: string }[] = []
  for (const m of messages) {
    if (m.role === 'system') continue
    out.push({ role: m.role, content: m.content })
  }
  return out
}

export const chatAnthropic = async (
  baseUrl: string,
  modelId: string,
  apiKey: string,
  messages: AiChatMessage[],
): Promise<{ ok: true; text: string } | { ok: false; error: string }> => {
  if (!apiKey.trim()) return { ok: false, error: 'Anthropic 需要 API Key' }
  const url = buildAnthropicMessagesUrl(baseUrl)
  const res = await fetch(url, {
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
  })
  if (!res.ok) {
    const errText = await res.text()
    return { ok: false, error: `请求失败 (${res.status}): ${errText.slice(0, 300)}` }
  }
  const data = (await res.json()) as { content?: { type: string; text?: string }[] }
  const block = data.content?.find((c) => c.type === 'text')
  return { ok: true, text: block?.text ?? '' }
}
