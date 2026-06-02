import type { UserEntry } from '../users-types'
import type { WorkshopRoleId } from './workshop-types'

const isManager = (u: UserEntry) => Boolean(u.isBuiltin && u.builtinRole === 'manager')

const employeeRoles: WorkshopRoleId[] = ['manager', 'backend', 'frontend', 'tester']

export const isEmployeeRole = (roleId: WorkshopRoleId): roleId is (typeof employeeRoles)[number] =>
  employeeRoles.includes(roleId as (typeof employeeRoles)[number])

export const findUserById = (users: UserEntry[], userId: string): UserEntry | undefined =>
  users.find((u) => u.id === userId)

/** 将 users.json 角色文案映射到 Workshop UI 色块（展示用） */
export const inferWorkshopRoleId = (user: UserEntry): Exclude<WorkshopRoleId, 'system' | 'user'> => {
  if (isManager(user)) return 'manager'
  const r = user.role.toLowerCase()
  if (r.includes('前端')) return 'frontend'
  if (r.includes('测试')) return 'tester'
  if (r.includes('后端') || r.includes('架构')) return 'backend'
  return 'backend'
}

/** Workshop 固定角色 id → users.json（兼容旧匹配） */
export const findUserForWorkshopRole = (
  users: UserEntry[],
  roleId: WorkshopRoleId,
): UserEntry | undefined => {
  if (roleId === 'system' || roleId === 'user') return undefined
  if (roleId === 'manager') return users.find(isManager)
  const title = roleId === 'backend' ? '后端' : roleId === 'frontend' ? '前端' : '测试'
  return users.find(
    (u) => !u.isBuiltin && (u.role.trim() === title || u.role.trim().includes(title)),
  )
}
