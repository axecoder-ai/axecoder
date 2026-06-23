export type ChatModeId =
  | 'agent'
  | 'auto-plan'
  | 'plan'
  | 'planning'
  | 'planning-only'
  | 'draw-io'
  | 'multi-agent'
  | 'software-company'

export type ChatModeOption = {
  id: ChatModeId
  label: string
  description: string
}

export const CHAT_MODE_OPTIONS: ChatModeOption[] = [
  {
    id: 'agent',
    label: 'Agent',
    description:
      'Read/write code and use tools; complex tasks auto-enter read-only plan mode first (heuristic + cheap model; /auto-plan off to disable)',
  },
  {
    id: 'plan',
    label: 'Plan',
    description: 'Plan first; file writes and shell need exiting plan mode',
  },
  {
    id: 'draw-io',
    label: 'Draw.IO',
    description: 'AI-assisted draw.io diagrams in Workshop with embedded canvas',
  },
  {
    id: 'multi-agent',
    label: 'Multi-Agent',
    description: 'Collab workshop in this chat: roles discuss in turn',
  },
  {
    id: 'software-company',
    label: 'Software Co.',
    description: 'MetaGPT SOP: PRD → design → tasks → code → QA; each role runs at Agent efficiency',
  },
]

export const DEFAULT_CHAT_MODE: ChatModeId = 'agent'

export const isAgentAutoPlanOn = (v?: 'off' | 'on') => v !== 'off'

export const agentAutoPlanSetting = (on: boolean): 'off' | 'on' => (on ? 'on' : 'off')

/** 暂不在 UI / SwitchMode 中开放 */
export const DISABLED_CHAT_MODES = new Set<ChatModeId>(['planning-only'])

export const isWorkshopEmbeddedChatMode = (id: ChatModeId) =>
  id === 'draw-io' || id === 'multi-agent' || id === 'software-company'

export const isChatModeEnabled = (id: ChatModeId) => !DISABLED_CHAT_MODES.has(id)

const CHAT_MODE_STORAGE_KEY = 'axecoder.chatMode'

export const chatModeLabel = (id: ChatModeId) => {
  if (id === 'planning') return 'Plan'
  if (id === 'auto-plan') return 'Agent'
  return CHAT_MODE_OPTIONS.find((m) => m.id === id)?.label ?? 'Agent'
}

/** 旧版 localStorage / 会话里可能仍存 auto-plan、已下线的 reflection / rppit */
const LEGACY_CHAT_MODE_IDS = new Set<string>(['auto-plan', 'planning', 'reflection', 'rppit'])

export const isChatModeId = (v: unknown): v is ChatModeId =>
  typeof v === 'string' &&
  (CHAT_MODE_OPTIONS.some((m) => m.id === v) ||
    DISABLED_CHAT_MODES.has(v as ChatModeId) ||
    LEGACY_CHAT_MODE_IDS.has(v))

export const loadStoredChatMode = (): ChatModeId => {
  try {
    const raw = localStorage.getItem(CHAT_MODE_STORAGE_KEY)
    if (!raw) return DEFAULT_CHAT_MODE
    let mode: ChatModeId
    if (raw === 'auto-plan' || raw === 'reflection' || raw === 'rppit' || raw === 'understand') mode = 'agent'
    else if (raw === 'planning') mode = 'plan'
    else if (isChatModeId(raw)) mode = raw
    else return DEFAULT_CHAT_MODE
    if (!isChatModeEnabled(mode)) return DEFAULT_CHAT_MODE
    if (mode !== raw) saveStoredChatMode(mode)
    return mode
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

/** 会话已有消息后：不可切入嵌入 Workshop 的模式 */
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
