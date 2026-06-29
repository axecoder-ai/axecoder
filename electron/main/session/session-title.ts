import { getModelById } from '../models-store'
import { getSecret } from '../secrets-store'
import { chatWithProvider } from '../ai/chat-with-provider'
import { resolveApiModelIdForTask } from '../ai/api-model-resolve'
import { t, getMainLocale } from '../i18n'
import { translate, messagesByLocale, type LocaleId } from '../../../shared/i18n'

export type TitleDialogMessage = {
  role: 'user' | 'assistant'
  text: string
}

const buildDefaultTitleSet = (): Set<string> => {
  const s = new Set<string>(['New Agent'])
  for (const loc of Object.keys(messagesByLocale) as LocaleId[]) {
    s.add(translate(loc, 'session.defaultAgent'))
    s.add(translate(loc, 'session.defaultChat'))
  }
  return s
}

export const DEFAULT_SESSION_TITLES = buildDefaultTitleSet()

/** 协作/画图等模式预建会话的占位标题，应被首句或 LLM 主题替换 */
export const CHAT_MODE_PLACEHOLDER_TITLES = new Set([
  'Draw.IO',
  'Multi-Agent',
  'Software Co.',
  'Collab Workshop',
])

export const truncateSessionTitle = (text: string, maxLen = 24): string => {
  const line = text.trim()
  if (!line) return ''
  return line.length > maxLen ? `${line.slice(0, maxLen)}…` : line
}

export const firstUserMessageText = (messages: TitleDialogMessage[]): string => {
  const m = messages.find((x) => x.role === 'user' && x.text.trim())
  return m?.text.trim() ?? ''
}

export const isPlaceholderSessionTitle = (title: string, firstUserText: string): boolean => {
  const line = title.trim()
  if (!line || DEFAULT_SESSION_TITLES.has(line) || CHAT_MODE_PLACEHOLDER_TITLES.has(line)) return true
  const first = firstUserText.trim()
  if (first && (line === truncateSessionTitle(first) || line === first)) return true
  if (/^(你好|您好|hi|hello|hey)$/i.test(line)) return true
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
  const loc = getMainLocale()
  const dialog = messages
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && m.text.trim())
    .slice(-maxLines)
  const body = dialog.map((m) => `${m.role}: ${m.text.trim().slice(0, 500)}`).join('\n')
  return [
    translate(loc, 'session.titlePromptIntro'),
    translate(loc, 'session.titlePromptRule'),
    '',
    translate(loc, 'session.conversationLabel'),
    body,
  ].join('\n')
}

export const parseSuggestedTitle = (raw: string): string | null => {
  let line = raw.trim().split('\n')[0]?.trim() ?? ''
  line = line.replace(/^["'「『【]+|["'」』】]+$/g, '').trim()
  line = line.replace(/^(Title|Topic|主题)[:：]\s*/i, '').trim()
  if (!line) return null
  if (line.length > 32) line = `${line.slice(0, 32)}…`
  return line
}

export const suggestChatSessionTitle = async (
  modelId: string,
  messages: TitleDialogMessage[],
  currentTitle: string,
): Promise<{ ok: true; title: string } | { ok: false; error: string }> => {
  if (!shouldSuggestSessionTitle(messages, currentTitle)) {
    return { ok: false, error: t('errors.titleNotNeeded') }
  }
  const id = modelId.trim()
  if (!id) return { ok: false, error: t('errors.noModelSelected') }
  const model = await getModelById(id)
  if (!model) return { ok: false, error: t('errors.modelNotFound') }
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
  if (!title) return { ok: false, error: t('errors.titleParseFailed') }
  if (isPlaceholderSessionTitle(title, firstUserMessageText(messages))) {
    return { ok: false, error: t('errors.titleStillPlaceholder') }
  }
  return { ok: true, title }
}
