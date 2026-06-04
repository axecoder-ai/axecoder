import type { WorkshopRoleId } from '../types/axecoder'

/** 跟踪当前 Workshop 直播气泡对应的角色 / Agent 流，用于切换时清空进度 */
export type WorkshopLiveTurnState = {
  workshopRole: WorkshopRoleId | null
  agentStreamKey: string | null
}

export const createWorkshopLiveTurnState = (): WorkshopLiveTurnState => ({
  workshopRole: null,
  agentStreamKey: null,
})

export const clearWorkshopLiveTurnState = (state: WorkshopLiveTurnState) => {
  state.workshopRole = null
  state.agentStreamKey = null
}

const isLiveWorkshopRole = (roleId: WorkshopRoleId) =>
  roleId !== 'system' && roleId !== 'user'

/** workshop:progress 角色变化时返回 true，调用方应清空 progressSteps */
export const markWorkshopLiveRole = (
  state: WorkshopLiveTurnState,
  roleId: WorkshopRoleId,
): boolean => {
  if (!isLiveWorkshopRole(roleId)) return false
  if (state.workshopRole === roleId) return false
  state.workshopRole = roleId
  state.agentStreamKey = null
  return true
}

/** agent:progress 流 key（u-xxx 或 manager）变化时返回 true */
export const markWorkshopAgentStreamKey = (
  state: WorkshopLiveTurnState,
  streamKey: string,
): boolean => {
  const key = streamKey.trim()
  if (!key) return false
  if (state.agentStreamKey === key) return false
  state.agentStreamKey = key
  return true
}
