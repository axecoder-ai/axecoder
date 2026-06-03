import fs from 'node:fs/promises'
import path from 'node:path'
import type { UserEntry, UserSaveInput, UsersFile } from './users-types'
import { ensureAxecoderDir, axecoderPath, getAxecoderDir } from './axecoder-dir'

export const BUILTIN_MANAGER_ID = 'builtin-manager'
const MANAGER_ROLE = '技术经理'
const MANAGER_EXPERTISE = '需求拆解、任务协调、技术评审'

const usersPath = () => axecoderPath('users.json')
const avatarsDir = () => axecoderPath('user-avatars')

const emptyUsers = (): UsersFile => ({
  schemaVersion: 1,
  users: [],
})

const seedBuiltinManager = (): UserEntry => ({
  id: BUILTIN_MANAGER_ID,
  displayName: MANAGER_ROLE,
  role: MANAGER_ROLE,
  expertise: MANAGER_EXPERTISE,
  avatarPath: '',
  isBuiltin: true,
  builtinRole: 'manager',
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

const ensureBuiltinManager = async (data: UsersFile): Promise<UsersFile> => {
  const has = data.users.some((u) => u.isBuiltin && u.builtinRole === 'manager')
  if (has) return data
  return { schemaVersion: 1, users: [seedBuiltinManager(), ...data.users] }
}

export const listUsers = async (): Promise<UsersFile> => {
  let data = await readUsersFile()
  data = await ensureBuiltinManager(data)
  const before = await readUsersFile()
  if (before.users.length !== data.users.length) await writeUsersFile(data)
  return data
}

const isBuiltinManager = (u: UserEntry | undefined) =>
  Boolean(u?.isBuiltin && u.builtinRole === 'manager')

export const saveUser = async (input: UserSaveInput): Promise<UsersFile> => {
  const data = await listUsers()
  const existing = data.users.find((u) => u.id === input.id)
  let entry: UserEntry
  const skillSlugs = (input.skillSlugs ?? existing?.skillSlugs ?? []).map((s) => s.trim().toLowerCase()).filter(Boolean)
  if (isBuiltinManager(existing)) {
    entry = {
      ...existing!,
      displayName: input.displayName.trim() || MANAGER_ROLE,
      avatarPath: input.avatarPath !== undefined ? input.avatarPath : existing!.avatarPath,
      role: MANAGER_ROLE,
      expertise: MANAGER_EXPERTISE,
      skillSlugs,
    }
  } else {
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
  if (target.isBuiltin) throw new Error('内置用户不可删除')
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
