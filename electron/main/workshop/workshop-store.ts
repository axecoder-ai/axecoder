import fs from 'node:fs/promises'
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
        text: '（无结论）',
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

const writeFileAtomic = async (filePath: string, content: string) => {
  const tmp = `${filePath}.tmp.${process.pid}`
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
    const session = JSON.parse(raw) as WorkshopSession
    if (!session?.id || !Array.isArray(session.messages)) return { session: null }
    session.messages = normalizeWorkshopMessages(session.messages)
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
  if (!root) return { ok: false, error: '未打开项目' }
  if (!session?.id?.trim()) return { ok: false, error: 'workshop id 无效' }
  try {
    await ensureProjectWorkshopsDir(root)
    const meta: SessionRegistryEntry = {
      id: session.id,
      title: session.title,
      updatedAt: session.updatedAt,
      kind: 'workshop',
    }
    const index = upsertRegistryEntry(await readRegistry(root), meta)
    await writeFileAtomic(projectWorkshopFilePath(root, session.id), JSON.stringify(session))
    await writeRegistry(root, index)
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : '保存失败'
    return { ok: false, error: msg }
  }
}

export const deleteWorkshopSession = async (
  projectRoot: string,
  workshopId: string,
): Promise<StoreResult> => {
  const root = await normalizeProjectRoot(projectRoot)
  if (!root) return { ok: false, error: '未打开项目' }
  try {
    const index = removeRegistryEntry(await readRegistry(root), workshopId, 'workshop')
    await writeRegistry(root, index)
    await removeLegacyWorkshopIndexEntry(root, workshopId)
    await fs.rm(projectWorkshopFilePath(root, workshopId), { force: true })
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : '删除失败'
    return { ok: false, error: msg }
  }
}
