import type { UserEntry } from '../types/axecoder'
import type { WorkshopRoleUiId } from './workshop-roles'

const isManager = (u: UserEntry) => Boolean(u.isBuiltin && u.builtinRole === 'manager')

/** Workshop 角色 → 设置里 Users 条目（按 role / builtin 匹配） */
export const findUserForWorkshopRole = (
  users: UserEntry[],
  roleId: WorkshopRoleUiId,
): UserEntry | undefined => {
  if (roleId === 'system') return undefined
  if (roleId === 'manager') return users.find(isManager)
  if (roleId === 'user') {
    return users.find((u) => !isManager(u) && /需求/.test(u.role.trim()))
  }
  const title = roleId === 'backend' ? '后端' : roleId === 'frontend' ? '前端' : '测试'
  return users.find(
    (u) => !u.isBuiltin && (u.role.trim() === title || u.role.trim().includes(title)),
  )
}

export const findUserById = (users: UserEntry[], userId: string) =>
  users.find((u) => u.id === userId)

export const inferWorkshopRoleId = (
  user: UserEntry,
): 'manager' | 'backend' | 'frontend' | 'tester' => {
  if (user.isBuiltin && user.builtinRole === 'manager') return 'manager'
  const r = user.role.toLowerCase()
  if (r.includes('前端')) return 'frontend'
  if (r.includes('测试')) return 'tester'
  return 'backend'
}
