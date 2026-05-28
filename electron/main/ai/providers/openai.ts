import type { AiChatMessage } from '../../models-types'
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
  let res: Response
  try {
    res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({ model: modelId, messages: aiChatToOpenAiWire(messages), stream: false }),
      signal: AbortSignal.timeout(120_000),
    })
  } catch (e) {
    const name = e instanceof Error ? e.name : ''
    if (name === 'TimeoutError' || name === 'AbortError') {
      return { ok: false, error: '请求超时（120s），请检查网络或减小引用文件大小' }
    }
    const msg = e instanceof Error ? e.message : '网络错误'
    return { ok: false, error: msg }
  }
  if (!res.ok) {
    const errText = await res.text()
    return { ok: false, error: `请求失败 (${res.status}): ${errText.slice(0, 300)}` }
  }
  const data = (await res.json()) as { choices?: { message?: Record<string, unknown> }[] }
  const parts = parseOpenAiAssistantParts(data.choices?.[0]?.message)
  return { ok: true, text: parts.displayText, content: parts.content, reasoningContent: parts.reasoningContent }
}
