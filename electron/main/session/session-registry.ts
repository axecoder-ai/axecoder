import fs from 'node:fs/promises'
import path from 'node:path'
import {
  ensureProjectSessionsDir,
  normalizeProjectRoot,
  projectSessionsIndexPath,
  projectWorkshopsIndexPath,
  resolveProjectSessionsDir,
} from '../project-axecoder-dir'
import type { SessionKind, SessionRegistryEntry } from './session-types'

const writeFileAtomic = async (filePath: string, content: string) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`
  await fs.writeFile(tmp, content, 'utf-8')
  await fs.rename(tmp, filePath)
}

/** 同一项目 index.json 串行写入，避免并发 rename ENOENT */
const registryWriteTails = new Map<string, Promise<unknown>>()

const runRegistryWriteSerialized = <T>(projectRoot: string, fn: () => Promise<T>): Promise<T> => {
  const prev = registryWriteTails.get(projectRoot) ?? Promise.resolve()
  const next = prev.catch(() => {}).then(fn)
  registryWriteTails.set(
    projectRoot,
    next.then(
      () => undefined,
      () => undefined,
    ),
  )
  return next
}

const normalizeEntry = (raw: unknown): SessionRegistryEntry | null => {
  if (!raw || typeof raw !== 'object') return null
  const o = raw as Record<string, unknown>
  if (typeof o.id !== 'string' || !o.id.trim()) return null
  if (typeof o.title !== 'string') return null
  if (typeof o.updatedAt !== 'number') return null
  const kind: SessionKind =
    o.kind === 'workshop' ? 'workshop' : 'agent'
  return { id: o.id, title: o.title, updatedAt: o.updatedAt, kind }
}

const sortEntries = (list: SessionRegistryEntry[]) =>
  [...list].sort((a, b) => b.updatedAt - a.updatedAt)

export const upsertRegistryEntry = (
  list: SessionRegistryEntry[],
  entry: SessionRegistryEntry,
) => {
  const rest = list.filter((s) => !(s.id === entry.id && s.kind === entry.kind))
  return sortEntries([entry, ...rest])
}

export const removeRegistryEntry = (
  list: SessionRegistryEntry[],
  id: string,
  kind?: SessionKind,
) => {
  if (kind) return list.filter((s) => !(s.id === id && s.kind === kind))
  return list.filter((s) => s.id !== id)
}

const readRegistryRaw = async (projectRoot: string): Promise<SessionRegistryEntry[]> => {
  try {
    const sessionsDir = await resolveProjectSessionsDir(projectRoot)
    const raw = await fs.readFile(projectSessionsIndexPath(projectRoot, sessionsDir), 'utf-8')
    const parsed = JSON.parse(raw) as unknown[]
    if (!Array.isArray(parsed)) return []
    const out: SessionRegistryEntry[] = []
    for (const item of parsed) {
      const e = normalizeEntry(item)
      if (e) out.push(e)
    }
    return sortEntries(out)
  } catch {
    return []
  }
}

const readLegacyWorkshopIndex = async (projectRoot: string): Promise<SessionRegistryEntry[]> => {
  try {
    const raw = await fs.readFile(projectWorkshopsIndexPath(projectRoot), 'utf-8')
    const parsed = JSON.parse(raw) as unknown[]
    if (!Array.isArray(parsed)) return []
    const out: SessionRegistryEntry[] = []
    for (const item of parsed) {
      const e = normalizeEntry(item)
      if (!e) continue
      out.push({ ...e, kind: 'workshop' })
    }
    return out
  } catch {
    return []
  }
}

/** 合并旧 workshops/index.json 到统一 index（幂等） */
export const ensureRegistryMigrated = async (projectRoot: string): Promise<void> => {
  const root = await normalizeProjectRoot(projectRoot)
  if (!root) return

  let registry = await readRegistryRaw(root)
  const legacyWorkshops = await readLegacyWorkshopIndex(root)
  if (!legacyWorkshops.length) return

  const keys = new Set(registry.map((s) => `${s.kind}:${s.id}`))
  let changed = false
  for (const w of legacyWorkshops) {
    const key = `workshop:${w.id}`
    if (keys.has(key)) continue
    registry = upsertRegistryEntry(registry, w)
    keys.add(key)
    changed = true
  }
  if (!changed) return

  await writeRegistry(root, registry)
}

export const readRegistry = async (projectRoot: string): Promise<SessionRegistryEntry[]> => {
  const root = await normalizeProjectRoot(projectRoot)
  if (!root) return []
  await ensureRegistryMigrated(root)
  return readRegistryRaw(root)
}

export const writeRegistry = async (projectRoot: string, list: SessionRegistryEntry[]) => {
  const root = await normalizeProjectRoot(projectRoot)
  if (!root) throw new Error('No project open')
  return runRegistryWriteSerialized(root, async () => {
    await ensureProjectSessionsDir(root)
    await writeFileAtomic(projectSessionsIndexPath(root), JSON.stringify(sortEntries(list)))
  })
}

export const listRegistryByKind = async (
  projectRoot: string,
  kind: SessionKind,
): Promise<SessionRegistryEntry[]> => {
  const all = await readRegistry(projectRoot)
  return all.filter((s) => s.kind === kind)
}

export const listAllSessions = async (projectRoot: string) => {
  const sessions = await readRegistry(projectRoot)
  return { sessions }
}

/** 从旧 workshops/index.json 移除条目，避免迁移后已删会话再次出现 */
export const removeLegacyWorkshopIndexEntry = async (
  projectRoot: string,
  workshopId: string,
): Promise<void> => {
  try {
    const indexPath = projectWorkshopsIndexPath(projectRoot)
    const raw = await fs.readFile(indexPath, 'utf-8')
    const parsed = JSON.parse(raw) as unknown[]
    if (!Array.isArray(parsed)) return
    const next = parsed.filter((item) => {
      const e = normalizeEntry(item)
      return e?.id !== workshopId
    })
    if (next.length === parsed.length) return
    await writeFileAtomic(indexPath, JSON.stringify(next))
  } catch {
    /* 无旧索引则跳过 */
  }
}
