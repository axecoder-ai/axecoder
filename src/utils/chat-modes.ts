export type ChatModeId =
  | 'agent'
  | 'auto-plan'
  | 'reflection'
  | 'rppit'
  | 'planning'
  | 'planning-only'
  | 'multi-agent'

export type ChatModeOption = {
  id: ChatModeId
  label: string
  description: string
}

export const CHAT_MODE_OPTIONS: ChatModeOption[] = [
  {
    id: 'agent',
    label: 'Agent',
    description: 'Default Agent: read/write code and use tools',
  },
  {
    id: 'auto-plan',
    label: 'Auto Plan',
    description:
      'Like Agent, but complex tasks auto-enter read-only plan mode first (heuristic + cheap model)',
  },
  {
    id: 'reflection',
    label: 'Reflection',
    description:
      'Developer↔Reviewer reflection loop with Tech Lead guidance (1–3 rounds) in Workshop panel',
  },
  {
    id: 'rppit',
    label: 'rppit',
    description: 'Each message runs the /rppit playbook (proposals → plan → implement → review)',
  },
  {
    id: 'planning',
    label: 'Planning',
    description: 'Plan first; file writes and shell need exiting plan mode',
  },
  {
    id: 'multi-agent',
    label: 'Multi-Agent',
    description: 'Collab workshop in this chat: roles discuss in turn',
  },
]

export const DEFAULT_CHAT_MODE: ChatModeId = 'agent'

/** 暂不在 UI / SwitchMode 中开放 */
export const DISABLED_CHAT_MODES = new Set<ChatModeId>(['planning-only'])

export const isWorkshopEmbeddedChatMode = (id: ChatModeId) =>
  id === 'multi-agent' || id === 'reflection'

export const isChatModeEnabled = (id: ChatModeId) => !DISABLED_CHAT_MODES.has(id)

const CHAT_MODE_STORAGE_KEY = 'axecoder.chatMode'

export const chatModeLabel = (id: ChatModeId) =>
  CHAT_MODE_OPTIONS.find((m) => m.id === id)?.label ?? 'Agent'

export const isChatModeId = (v: unknown): v is ChatModeId =>
  typeof v === 'string' &&
  (CHAT_MODE_OPTIONS.some((m) => m.id === v) || DISABLED_CHAT_MODES.has(v as ChatModeId))

export const loadStoredChatMode = (): ChatModeId => {
  try {
    const raw = localStorage.getItem(CHAT_MODE_STORAGE_KEY)
    if (!isChatModeId(raw) || !isChatModeEnabled(raw)) return DEFAULT_CHAT_MODE
    return raw
  } catch {
    return DEFAULT_CHAT_MODE
  }
}

export const saveStoredChatMode = (id: ChatModeId) => {
  try {
    localStorage.setItem(CHAT_MODE_STORAGE_KEY, id)
  } catch {
    /* ignore */
  }
}

/** 会话已有消息后：multi-agent / reflection 互斥；不可切入嵌入 Workshop 的模式 */
export const canPickChatMode = (
  current: ChatModeId,
  next: ChatModeId,
  hasMessages: boolean,
): boolean => {
  if (!isChatModeEnabled(next)) return false
  if (current === next) return true
  if (!hasMessages) return true
  if (isWorkshopEmbeddedChatMode(current) && isWorkshopEmbeddedChatMode(next)) return false
  if (isWorkshopEmbeddedChatMode(next)) return false
  return true
}
