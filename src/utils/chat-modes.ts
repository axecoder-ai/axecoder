export type ChatModeId =
  | 'agent'
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
    id: 'reflection',
    label: 'Reflection',
    description: 'Analyze trade-offs first, then decide whether to edit code',
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
    id: 'planning-only',
    label: 'Planning Only',
    description: 'Read-only exploration and proposals; no file changes',
  },
  {
    id: 'multi-agent',
    label: 'Multi-Agent',
    description: 'Split work and dispatch sub-agents via the Agent tool',
  },
]

export const DEFAULT_CHAT_MODE: ChatModeId = 'agent'

const CHAT_MODE_STORAGE_KEY = 'axecoder.chatMode'

export const chatModeLabel = (id: ChatModeId) =>
  CHAT_MODE_OPTIONS.find((m) => m.id === id)?.label ?? 'Agent'

export const isChatModeId = (v: unknown): v is ChatModeId =>
  typeof v === 'string' && CHAT_MODE_OPTIONS.some((m) => m.id === v)

export const loadStoredChatMode = (): ChatModeId => {
  try {
    const raw = localStorage.getItem(CHAT_MODE_STORAGE_KEY)
    return isChatModeId(raw) ? raw : DEFAULT_CHAT_MODE
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
