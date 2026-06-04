import type { UserEntry } from '../users-types'
import type { WorkshopRoleId } from './workshop-types'

const isManager = (u: UserEntry) => Boolean(u.isBuiltin && u.builtinRole === 'manager')

const employeeRoles: WorkshopRoleId[] = ['manager', 'backend', 'frontend', 'tester']

export const isEmployeeRole = (roleId: WorkshopRoleId): roleId is (typeof employeeRoles)[number] =>
  employeeRoles.includes(roleId as (typeof employeeRoles)[number])

export const findUserById = (users: UserEntry[], userId: string): UserEntry | undefined =>
  users.find((u) => u.id === userId)

/** Map users.json role text to Workshop UI color (display) */
export const inferWorkshopRoleId = (user: UserEntry): Exclude<WorkshopRoleId, 'system' | 'user'> => {
  if (isManager(user)) return 'manager'
  const r = user.role.toLowerCase()
  if (r.includes('Frontend')) return 'frontend'
  if (r.includes('QA')) return 'tester'
  if (r.includes('Backend') || r.includes('architecture')) return 'backend'
  return 'backend'
}

/** Workshop fixed role ids → users.json (legacy match) */
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
