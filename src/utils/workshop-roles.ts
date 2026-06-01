export type WorkshopRoleUiId = 'manager' | 'backend' | 'frontend' | 'tester' | 'system' | 'user'

export type WorkshopRoleUi = {
  nickname: string
  roleTitle: string
  avatar: string
  color: string
}

export const WORKSHOP_ROLE_UI: Record<WorkshopRoleUiId, WorkshopRoleUi> = {
  manager: {
    nickname: '王经理',
    roleTitle: '技术经理',
    avatar: '经',
    color: '#6366f1',
  },
  backend: {
    nickname: '小陈',
    roleTitle: '后端',
    avatar: '后',
    color: '#0ea5e9',
  },
  frontend: {
    nickname: '小林',
    roleTitle: '前端',
    avatar: '前',
    color: '#22c55e',
  },
  tester: {
    nickname: '小周',
    roleTitle: '测试',
    avatar: '测',
    color: '#f59e0b',
  },
  system: {
    nickname: '系统',
    roleTitle: '协作助手',
    avatar: '系',
    color: '#94a3b8',
  },
  user: {
    nickname: '你',
    roleTitle: '需求方',
    avatar: '我',
    color: '#a855f7',
  },
}

export const workshopRoleUi = (roleId: string): WorkshopRoleUi =>
  WORKSHOP_ROLE_UI[roleId as WorkshopRoleUiId] ?? WORKSHOP_ROLE_UI.system
