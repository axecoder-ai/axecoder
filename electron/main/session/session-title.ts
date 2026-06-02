import { getModelById } from '../models-store'
import { getSecret } from '../secrets-store'
import { chatWithProvider } from '../ai/chat-with-provider'
import { resolveApiModelIdForTask } from '../ai/api-model-resolve'

export type TitleDialogMessage = {
  role: 'user' | 'assistant'
  text: string
}

export const DEFAULT_SESSION_TITLES = new Set(['New Agent', '新对话'])

export const truncateSessionTitle = (text: string, maxLen = 24): string => {
  const t = text.trim()
  if (!t) return ''
  return t.length > maxLen ? `${t.slice(0, maxLen)}…` : t
}

export const firstUserMessageText = (messages: TitleDialogMessage[]): string => {
  const m = messages.find((x) => x.role === 'user' && x.text.trim())
  return m?.text.trim() ?? ''
}

export const isPlaceholderSessionTitle = (title: string, firstUserText: string): boolean => {
  const t = title.trim()
  if (!t || DEFAULT_SESSION_TITLES.has(t)) return true
  const first = firstUserText.trim()
  if (first && (t === truncateSessionTitle(first) || t === first)) return true
  if (/^(你好|您好|hi|hello|hey)$/i.test(t)) return true
  return false
}

export const shouldSuggestSessionTitle = (
  messages: TitleDialogMessage[],
  title: string,
): boolean => {
  const dialog = messages.filter(
    (m) => (m.role === 'user' || m.role === 'assistant') && m.text.trim(),
  )
  if (dialog.length < 4) return false
  return isPlaceholderSessionTitle(title, firstUserMessageText(messages))
}

export const buildTitlePrompt = (messages: TitleDialogMessage[], maxLines = 8): string => {
  const dialog = messages
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.text.trim())
    .slice(-maxLines)
  const body = dialog.map((m) => `${m.role}: ${m.text.trim().slice(0, 500)}`).join('\n')
  return [
    '根据以下对话，生成一个 6–16 字的中文会话主题，概括讨论核心。',
    '只输出标题本身：不要引号、不要编号、不要解释。',
    '',
    '对话：',
    body,
  ].join('\n')
}

export const parseSuggestedTitle = (raw: string): string | null => {
  let t = raw.trim().split('\n')[0]?.trim() ?? ''
  t = t.replace(/^["'「『【]+|["'」』】]+$/g, '').trim()
  t = t.replace(/^(标题|主题)[:：]\s*/i, '').trim()
  if (!t) return null
  if (t.length > 32) t = `${t.slice(0, 32)}…`
  return t
}

export const suggestChatSessionTitle = async (
  modelId: string,
  messages: TitleDialogMessage[],
  currentTitle: string,
): Promise<{ ok: true; title: string } | { ok: false; error: string }> => {
  if (!shouldSuggestSessionTitle(messages, currentTitle)) {
    return { ok: false, error: '暂不需要生成标题' }
  }
  const id = modelId.trim()
  if (!id) return { ok: false, error: '未选择模型' }
  const model = await getModelById(id)
  if (!model) return { ok: false, error: '模型不存在' }
  const apiKey = await getSecret(id)
  const apiModelId = await resolveApiModelIdForTask(model, 'subagent', '')
  const prompt = buildTitlePrompt(messages)
  const res = await chatWithProvider(
    model,
    apiKey,
    [{ role: 'user', content: prompt }],
    undefined,
    apiModelId,
  )
  if (!res.ok) return { ok: false, error: res.error }
  const title = parseSuggestedTitle(res.content ?? '')
  if (!title) return { ok: false, error: '无法解析标题' }
  if (isPlaceholderSessionTitle(title, firstUserMessageText(messages))) {
    return { ok: false, error: '生成结果仍为占位' }
  }
  return { ok: true, title }
}
