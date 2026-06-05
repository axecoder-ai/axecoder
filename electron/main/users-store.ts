import fs from 'node:fs/promises'
import path from 'node:path'
import {
  BUILTIN_MANAGER_ID,
  BUILTIN_WORKFLOW_ROLES,
  getBuiltinWorkflowRoleDef,
  isBuiltinWorkflowUser,
  seedBuiltinWorkflowUser,
} from './builtin-workflow-roles'
import type { UserEntry, UserSaveInput, UsersFile } from './users-types'
import { ensureAxecoderDir, axecoderPath, getAxecoderDir } from './axecoder-dir'

export { BUILTIN_MANAGER_ID } from './builtin-workflow-roles'

const usersPath = () => axecoderPath('users.json')
const avatarsDir = () => axecoderPath('user-avatars')

const emptyUsers = (): UsersFile => ({
  schemaVersion: 1,
  users: [],
})

const readUsersFile = async (): Promise<UsersFile> => {
  try {
    const raw = await fs.readFile(usersPath(), 'utf-8')
    const data = JSON.parse(raw) as UsersFile
    if (!data || data.schemaVersion !== 1 || !Array.isArray(data.users)) return emptyUsers()
    return { schemaVersion: 1, users: data.users }
  } catch {
    return emptyUsers()
  }
}

const writeUsersFile = async (data: UsersFile) => {
  await ensureAxecoderDir()
  await fs.writeFile(usersPath(), JSON.stringify(data, null, 2), 'utf-8')
}

const OLD_MANAGER_ROLE = '技术经理'
const OLD_MANAGER_EXPERTISE = '需求拆解、任务协调、技术评审'

const builtinRoleOrder = new Map(BUILTIN_WORKFLOW_ROLES.map((d, i) => [d.builtinRole, i]))

/** Tech Lead 置顶，其余内置角色按流水线顺序，自定义用户保持原相对顺序 */
const sortUsersList = (users: UserEntry[]): UserEntry[] => {
  const custom: UserEntry[] = []
  const builtins: UserEntry[] = []
  for (const u of users) {
    if (isBuiltinWorkflowUser(u)) builtins.push(u)
    else custom.push(u)
  }
  builtins.sort(
    (a, b) =>
      (builtinRoleOrder.get(a.builtinRole!) ?? 99) - (builtinRoleOrder.get(b.builtinRole!) ?? 99),
  )
  return [...builtins, ...custom]
}

const usersListEqual = (a: UserEntry[], b: UserEntry[]) =>
  a.length === b.length && a.every((u, i) => u.id === b[i]?.id)

const ensureBuiltinWorkflowUsers = (data: UsersFile): UsersFile => {
  let users = [...data.users]
  for (const def of BUILTIN_WORKFLOW_ROLES) {
    const idx = users.findIndex((u) => u.isBuiltin && u.builtinRole === def.builtinRole)
    if (idx < 0) {
      users = [seedBuiltinWorkflowUser(def), ...users]
    }
  }
  return { schemaVersion: 1, users }
}

const syncBuiltinWorkflowUsers = (data: UsersFile): { data: UsersFile; changed: boolean } => {
  let changed = false
  const users = data.users.map((u) => {
    if (!isBuiltinWorkflowUser(u) || !u.builtinRole) return u
    const def = getBuiltinWorkflowRoleDef(u.builtinRole)!
    const fromLegacyManager =
      u.builtinRole === 'manager' &&
      (u.role === OLD_MANAGER_ROLE || u.expertise === OLD_MANAGER_EXPERTISE)
    const outOfSync =
      u.role !== def.role ||
      u.expertise !== def.expertise ||
      JSON.stringify(u.skillSlugs ?? []) !== JSON.stringify(def.skillSlugs)
    if (!fromLegacyManager && !outOfSync) return u
    changed = true
    return {
      ...u,
      id: def.id,
      role: def.role,
      expertise: def.expertise,
      skillSlugs: [...def.skillSlugs],
      displayName:
        fromLegacyManager || (u.builtinRole === 'manager' && u.displayName === OLD_MANAGER_ROLE)
          ? def.displayName
          : u.displayName || def.displayName,
    }
  })
  return { data: { schemaVersion: 1, users }, changed }
}

export const listUsers = async (): Promise<UsersFile> => {
  let data = await readUsersFile()
  const beforeLen = data.users.length
  data = ensureBuiltinWorkflowUsers(data)
  const synced = syncBuiltinWorkflowUsers(data)
  data = synced.data
  const sorted = sortUsersList(data.users)
  const orderChanged = !usersListEqual(data.users, sorted)
  if (orderChanged) data = { schemaVersion: 1, users: sorted }
  if (synced.changed || beforeLen !== data.users.length || orderChanged) {
    await writeUsersFile(data)
  }
  return data
}

export const saveUser = async (input: UserSaveInput): Promise<UsersFile> => {
  const data = await listUsers()
  const existing = data.users.find((u) => u.id === input.id)
  let entry: UserEntry
  const def = existing?.builtinRole ? getBuiltinWorkflowRoleDef(existing.builtinRole) : undefined
  if (def) {
    entry = {
      ...existing!,
      id: def.id,
      displayName: input.displayName.trim() || def.displayName,
      avatarPath: input.avatarPath !== undefined ? input.avatarPath : existing!.avatarPath,
      role: def.role,
      expertise: def.expertise,
      skillSlugs: [...def.skillSlugs],
      isBuiltin: true,
      builtinRole: def.builtinRole,
    }
  } else {
    const skillSlugs = (input.skillSlugs ?? existing?.skillSlugs ?? [])
      .map((s) => s.trim().toLowerCase())
      .filter(Boolean)
    entry = {
      id: input.id,
      displayName: input.displayName.trim(),
      role: input.role.trim(),
      expertise: input.expertise.trim(),
      avatarPath: input.avatarPath ?? existing?.avatarPath ?? '',
      skillSlugs,
    }
  }
  const idx = data.users.findIndex((u) => u.id === entry.id)
  if (idx >= 0) data.users[idx] = entry
  else data.users.push(entry)
  await writeUsersFile(data)
  return data
}

export const deleteUser = async (id: string): Promise<UsersFile> => {
  const data = await listUsers()
  const target = data.users.find((u) => u.id === id)
  if (!target) return data
  if (target.isBuiltin) throw new Error('Built-in user cannot be deleted')
  data.users = data.users.filter((u) => u.id !== id)
  await writeUsersFile(data)
  if (target.avatarPath) {
    try {
      await fs.unlink(axecoderPath(target.avatarPath))
    } catch {
      /* ignore */
    }
  }
  return data
}

export const copyAvatarForUser = async (userId: string, sourceFile: string): Promise<string> => {
  await ensureAxecoderDir()
  await fs.mkdir(avatarsDir(), { recursive: true })
  const ext = path.extname(sourceFile).toLowerCase() || '.png'
  const allowed = ['.png', '.jpg', '.jpeg', '.gif', '.webp']
  const safeExt = allowed.includes(ext) ? ext : '.png'
  const rel = path.join('user-avatars', `${userId}${safeExt}`)
  const dest = axecoderPath(rel)
  await fs.copyFile(sourceFile, dest)
  const data = await listUsers()
  const u = data.users.find((x) => x.id === userId)
  if (u) {
    u.avatarPath = rel
    await writeUsersFile(data)
  }
  return rel
}

export const getUserAvatarDataUrl = async (avatarPath: string): Promise<string> => {
  if (!avatarPath.trim()) return ''
  const full = path.isAbsolute(avatarPath) ? avatarPath : axecoderPath(avatarPath)
  try {
    const buf = await fs.readFile(full)
    const ext = path.extname(full).toLowerCase()
    const mime =
      ext === '.png'
        ? 'image/png'
        : ext === '.gif'
          ? 'image/gif'
          : ext === '.webp'
            ? 'image/webp'
            : 'image/jpeg'
    return `data:${mime};base64,${buf.toString('base64')}`
  } catch {
    return ''
  }
}

export const getAxecoderDirForUsers = () => getAxecoderDir()
