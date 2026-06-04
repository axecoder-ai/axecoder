import type { UserEntry, WorkshopRoleId } from '../types/axecoder'

const isManager = (u: UserEntry) => Boolean(u.isBuiltin && u.builtinRole === 'manager')

/** Workshop role → Users entry in Settings (role/builtin match) */
export const findUserForWorkshopRole = (
  users: UserEntry[],
  roleId: WorkshopRoleId,
): UserEntry | undefined => {
  if (roleId === 'system' || roleId === 'user') return undefined
  if (roleId === 'manager') return users.find(isManager)
  const title = roleId === 'backend' ? 'Backend' : roleId === 'frontend' ? 'Frontend' : 'QA'
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
  if (r.includes('Frontend')) return 'frontend'
  if (r.includes('QA')) return 'tester'
  return 'backend'
}
