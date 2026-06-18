export type ChatModeId =
  | 'agent'
  | 'auto-plan'
  | 'reflection'
  | 'rppit'
  | 'plan'
  | 'planning'
  | 'planning-only'
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
    id: 'plan',
    label: 'Plan',
    description: 'Plan first; file writes and shell need exiting plan mode',
  },
  {
    id: 'multi-agent',
    label: 'Multi-Agent',
    description: 'Collab workshop in this chat: roles discuss in turn',
  },
  {
    id: 'software-company',
    label: 'Software Co.',
    description: 'MetaGPT-style SOP: PRD → design → tasks → code → QA',
  },
]

export const DEFAULT_CHAT_MODE: ChatModeId = 'agent'

export const isAgentAutoPlanOn = (v?: 'off' | 'on') => v !== 'off'

export const agentAutoPlanSetting = (on: boolean): 'off' | 'on' => (on ? 'on' : 'off')

/** 暂不在 UI / SwitchMode 中开放 */
export const DISABLED_CHAT_MODES = new Set<ChatModeId>(['planning-only'])

export const isWorkshopEmbeddedChatMode = (id: ChatModeId) =>
  id === 'multi-agent' || id === 'reflection' || id === 'software-company'

export const isChatModeEnabled = (id: ChatModeId) => !DISABLED_CHAT_MODES.has(id)

const CHAT_MODE_STORAGE_KEY = 'axecoder.chatMode'

export const chatModeLabel = (id: ChatModeId) => {
  if (id === 'planning') return 'Plan'
  if (id === 'auto-plan') return 'Agent'
  return CHAT_MODE_OPTIONS.find((m) => m.id === id)?.label ?? 'Agent'
}

/** 旧版 localStorage / 会话里可能仍存 auto-plan */
const LEGACY_CHAT_MODE_IDS = new Set<ChatModeId>(['auto-plan', 'planning'])

export const isChatModeId = (v: unknown): v is ChatModeId =>
  typeof v === 'string' &&
  (CHAT_MODE_OPTIONS.some((m) => m.id === v) ||
    DISABLED_CHAT_MODES.has(v as ChatModeId) ||
    LEGACY_CHAT_MODE_IDS.has(v as ChatModeId))

export const loadStoredChatMode = (): ChatModeId => {
  try {
    const raw = localStorage.getItem(CHAT_MODE_STORAGE_KEY)
    if (!isChatModeId(raw)) return DEFAULT_CHAT_MODE
    let mode: ChatModeId = raw
    if (raw === 'auto-plan') mode = 'agent'
    else if (raw === 'planning') mode = 'plan'
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
