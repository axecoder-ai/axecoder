import type { SessionListItem } from '../types/axecoder'

export const WC_CHAT_MIN = 320
export const WC_AGENTS_MIN = 200
export const WC_AGENTS_DEFAULT = 280
export const WC_EDITOR_MIN = 280
export const WC_SIDEBAR_DEFAULT = 260
export const WC_SIDEBAR_MIN = 180
export const WC_SIDEBAR_MAX = 560
export const WC_AI_PANEL_DEFAULT = WC_CHAT_MIN + WC_AGENTS_DEFAULT
export const AGENTS_GROUP_LIMIT = 8

export const clampPanelWidth = (
  width: number,
  containerWidth: number,
  otherMin: number,
  selfMin: number,
): number => {
  if (containerWidth <= 0) return selfMin
  const max = Math.max(selfMin, containerWidth - otherMin)
  return Math.min(Math.max(width, selfMin), max)
}

export const minAiPanelWidth = (agentsSidebarVisible: boolean, agentsW: number): number =>
  agentsSidebarVisible ? WC_CHAT_MIN + agentsW : WC_CHAT_MIN

export const clampAgentsWidth = (
  width: number,
  containerWidth: number,
  chatMin = WC_CHAT_MIN,
  agentsMin = WC_AGENTS_MIN,
): number => clampPanelWidth(width, containerWidth, chatMin, agentsMin)

export const clampSidebarWidth = (
  width: number,
  bodyWidth: number,
  centerMin: number,
): number => {
  if (bodyWidth <= 0) return WC_SIDEBAR_DEFAULT
  const max = Math.max(WC_SIDEBAR_MIN, Math.min(WC_SIDEBAR_MAX, bodyWidth - centerMin))
  return Math.min(Math.max(width, WC_SIDEBAR_MIN), max)
}

export const clampAiPanelWidth = (
  width: number,
  bodyWidth: number,
  agentsSidebarVisible: boolean,
  agentsW: number,
  editorMin = WC_EDITOR_MIN,
): number =>
  clampPanelWidth(
    width,
    bodyWidth,
    editorMin,
    minAiPanelWidth(agentsSidebarVisible, agentsW),
  )

export const isToday = (ts: number, now = Date.now()): boolean => {
  const d = new Date(ts)
  const n = new Date(now)
  return (
    d.getFullYear() === n.getFullYear() &&
    d.getMonth() === n.getMonth() &&
    d.getDate() === n.getDate()
  )
}

export type AgentSessionGroup = {
  key: string
  label: string
  items: SessionListItem[]
}

export const groupSessionsByDay = (
  sessions: SessionListItem[],
  now = Date.now(),
): AgentSessionGroup[] => {
  const today: SessionListItem[] = []
  const older: SessionListItem[] = []
  for (const s of sessions) {
    if (isToday(s.updatedAt, now)) today.push(s)
    else older.push(s)
  }
  const groups: AgentSessionGroup[] = []
  if (today.length) groups.push({ key: 'today', label: 'Today', items: today })
  if (older.length) groups.push({ key: 'older', label: 'Earlier', items: older })
  return groups
}

export const sliceGroupItems = (
  items: SessionListItem[],
  expanded: boolean,
  limit = AGENTS_GROUP_LIMIT,
): { visible: SessionListItem[]; hasMore: boolean } => {
  if (expanded || items.length <= limit) {
    return { visible: items, hasMore: false }
  }
  return { visible: items.slice(0, limit), hasMore: true }
}
