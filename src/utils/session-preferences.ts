import {
  DEFAULT_CHAT_MODE,
  normalizeChatModeFromStorage,
  type ChatModeId,
} from './chat-modes'

export type SessionPreferenceFields = {
  chatMode?: unknown
  modelId?: unknown
}

/** 切换 session：有记录用 session，否则保持当前 UI */
export const resolveSessionChatModeOnSwitch = (
  session: SessionPreferenceFields | null | undefined,
  currentUiMode: ChatModeId,
): ChatModeId => {
  const fromSession =
    session?.chatMode != null ? normalizeChatModeFromStorage(session.chatMode) : null
  return fromSession ?? currentUiMode
}

/** 切换 session：有记录用 session，否则保持当前 UI */
export const resolveSessionModelIdOnSwitch = (
  session: SessionPreferenceFields | null | undefined,
  currentUiModelId: string,
): string => {
  const raw = session?.modelId
  if (typeof raw === 'string' && raw.trim()) return raw.trim()
  return currentUiModelId
}

/** 发送消息时写入 session */
export const stampSessionPreferences = (
  session: SessionPreferenceFields,
  chatMode: ChatModeId,
  modelId: string,
) => {
  session.chatMode = chatMode
  const mid = modelId.trim()
  if (mid) session.modelId = mid
}

/** 新建 session 的初始偏好 */
export const newSessionPreferences = (globalDefaultModelId: string) => ({
  chatMode: DEFAULT_CHAT_MODE as ChatModeId,
  modelId: globalDefaultModelId.trim(),
})
