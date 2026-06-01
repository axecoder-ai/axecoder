import type { WorkshopRoleId } from './workshop-types'

export type WorkshopRoleDef = {
  id: Exclude<WorkshopRoleId, 'system' | 'user'>
  name: string
  avatar: string
  color: string
}

export const WORKSHOP_ROLES: WorkshopRoleDef[] = [
  { id: 'manager', name: '技术经理', avatar: '经', color: '#6366f1' },
  { id: 'backend', name: '后端', avatar: '后', color: '#0ea5e9' },
  { id: 'frontend', name: '前端', avatar: '前', color: '#22c55e' },
  { id: 'tester', name: '测试', avatar: '测', color: '#f59e0b' },
]

export const roleDefById = (id: WorkshopRoleId) =>
  WORKSHOP_ROLES.find((r) => r.id === id)

export const employeeRoleOrder: WorkshopRoleDef['id'][] = [
  'manager',
  'backend',
  'frontend',
  'tester',
]

export const systemAckForRole = (roleId: WorkshopRoleDef['id']): string => {
  if (roleId === 'manager') return '需求已记录，任务拆分已同步到群聊。'
  if (roleId === 'backend') return '已确认后端方案，进入前端评审。'
  if (roleId === 'frontend') return '已确认前端方案，进入测试评审。'
  if (roleId === 'tester') return '测试结论已记录，本轮协作完成。'
  return '已记录。'
}
