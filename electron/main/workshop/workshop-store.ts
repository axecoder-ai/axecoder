import fs from 'node:fs/promises'
import path from 'node:path'
import {
  ensureProjectWorkshopsDir,
  normalizeProjectRoot,
  projectWorkshopFilePath,
} from '../project-axecoder-dir'
import {
  listRegistryByKind,
  readRegistry,
  removeLegacyWorkshopIndexEntry,
  removeRegistryEntry,
  upsertRegistryEntry,
  writeRegistry,
} from '../session/session-registry'
import type { SessionRegistryEntry } from '../session/session-types'
import { stripLegacyWorkshopFields } from './workshop-api-messages'
import type { WorkshopMessage, WorkshopSession, WorkshopSessionMeta } from './workshop-types'

/** 将旧版 kind:reasoning 独立条合并进同角色正文消息 */
export const normalizeWorkshopMessages = (messages: WorkshopMessage[]): WorkshopMessage[] => {
  const out: WorkshopMessage[] = []
  let i = 0
  while (i < messages.length) {
    const m = messages[i]
    if (m.kind === 'reasoning') {
      const next = messages[i + 1]
      if (next && next.roleId === m.roleId && !next.hidden && next.kind !== 'reasoning') {
        out.push({
          ...next,
          reasoningContent: m.text || next.reasoningContent,
          kind: undefined,
        })
        i += 2
        continue
      }
      out.push({
        ...m,
        kind: undefined,
        reasoningContent: m.text,
        text: '(no conclusion)',
      })
      i++
      continue
    }
    if (m.reasoningContent || !m.kind) {
      out.push(m.kind ? { ...m, kind: undefined } : m)
    } else {
      out.push({ ...m, kind: undefined })
    }
    i++
  }
  return out
}

type StoreResult = { ok: true } | { ok: false; error: string }

/** 同一 workshop 文件串行保存，避免增量 done 与终态 save 并发 rename 同一 .tmp */
const workshopSaveTails = new Map<string, Promise<unknown>>()

const runWorkshopSaveSerialized = <T>(key: string, fn: () => Promise<T>): Promise<T> => {
  const prev = workshopSaveTails.get(key) ?? Promise.resolve()
  const next = prev.catch(() => {}).then(fn)
  workshopSaveTails.set(
    key,
    next.then(
      () => undefined,
      () => undefined,
    ),
  )
  return next
}

const writeFileAtomic = async (filePath: string, content: string) => {
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`
  await fs.writeFile(tmp, content, 'utf-8')
  await fs.rename(tmp, filePath)
}

const registryToWorkshopMeta = (list: SessionRegistryEntry[]): WorkshopSessionMeta[] =>
  list
    .filter((s) => s.kind === 'workshop')
    .map(({ id, title, updatedAt }) => ({ id, title, updatedAt }))

const readIndex = async (projectRoot: string): Promise<WorkshopSessionMeta[]> =>
  registryToWorkshopMeta(await listRegistryByKind(projectRoot, 'workshop'))

export const createWorkshopId = () =>
  `ws-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`

export const newWorkshopSession = (
  projectRoot: string,
  userBrief: string,
  modelId: string,
  preferredId?: string,
): WorkshopSession => {
  const now = Date.now()
  const id = preferredId?.trim() || createWorkshopId()
  const title = userBrief.trim().slice(0, 24) + (userBrief.trim().length > 24 ? '…' : '')
  return {
    id,
    title: title || 'Collab Workshop',
    updatedAt: now,
    userBrief: userBrief.trim(),
    modelId,
    messages: [],
    phase: 'idle',
    mountedFiles: [],
  }
}

export const listWorkshopSessions = async (projectRoot: string) => {
  const root = await normalizeProjectRoot(projectRoot)
  if (!root) return { sessions: [] as WorkshopSessionMeta[] }
  const sessions = await readIndex(root)
  return { sessions }
}

export const getWorkshopSession = async (projectRoot: string, workshopId: string) => {
  const root = await normalizeProjectRoot(projectRoot)
  if (!root) return { session: null as WorkshopSession | null }
  try {
    const raw = await fs.readFile(projectWorkshopFilePath(root, workshopId), 'utf-8')
    let session = JSON.parse(raw) as WorkshopSession
    if (!session?.id || !Array.isArray(session.messages)) return { session: null }
    session.messages = normalizeWorkshopMessages(session.messages)
    session = stripLegacyWorkshopFields(session)
    return { session }
  } catch {
    return { session: null }
  }
}

export const saveWorkshopSession = async (
  projectRoot: string,
  session: WorkshopSession,
): Promise<StoreResult> => {
  const root = await normalizeProjectRoot(projectRoot)
  if (!root) return { ok: false, error: 'No project open' }
  if (!session?.id?.trim()) return { ok: false, error: 'Invalid workshop id' }
  const filePath = projectWorkshopFilePath(root, session.id)
  return runWorkshopSaveSerialized(filePath, async () => {
    try {
      await ensureProjectWorkshopsDir(root)
      const meta: SessionRegistryEntry = {
        id: session.id,
        title: session.title,
        updatedAt: session.updatedAt,
        kind: 'workshop',
      }
      const index = upsertRegistryEntry(await readRegistry(root), meta)
      await writeFileAtomic(filePath, JSON.stringify(session))
      await writeRegistry(root, index)
      return { ok: true as const }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Save failed'
      return { ok: false as const, error: msg }
    }
  })
}

export const deleteWorkshopSession = async (
  projectRoot: string,
  workshopId: string,
): Promise<StoreResult> => {
  const root = await normalizeProjectRoot(projectRoot)
  if (!root) return { ok: false, error: 'No project open' }
  try {
    const index = removeRegistryEntry(await readRegistry(root), workshopId, 'workshop')
    await writeRegistry(root, index)
    await removeLegacyWorkshopIndexEntry(root, workshopId)
    await fs.rm(projectWorkshopFilePath(root, workshopId), { force: true })
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Delete failed'
    return { ok: false, error: msg }
  }
}
