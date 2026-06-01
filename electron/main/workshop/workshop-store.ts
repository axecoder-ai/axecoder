import fs from 'node:fs/promises'
import {
  ensureProjectWorkshopsDir,
  normalizeProjectRoot,
  projectWorkshopFilePath,
  projectWorkshopsIndexPath,
} from '../project-axecoder-dir'
import type { WorkshopSession, WorkshopSessionMeta } from './workshop-types'

type StoreResult = { ok: true } | { ok: false; error: string }

const writeFileAtomic = async (filePath: string, content: string) => {
  const tmp = `${filePath}.tmp.${process.pid}`
  await fs.writeFile(tmp, content, 'utf-8')
  await fs.rename(tmp, filePath)
}

const readIndex = async (projectRoot: string): Promise<WorkshopSessionMeta[]> => {
  try {
    const raw = await fs.readFile(projectWorkshopsIndexPath(projectRoot), 'utf-8')
    const list = JSON.parse(raw) as WorkshopSessionMeta[]
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

const writeIndex = async (projectRoot: string, list: WorkshopSessionMeta[]) => {
  await ensureProjectWorkshopsDir(projectRoot)
  await writeFileAtomic(projectWorkshopsIndexPath(projectRoot), JSON.stringify(list))
}

const upsertMeta = (list: WorkshopSessionMeta[], session: WorkshopSessionMeta) => {
  const rest = list.filter((s) => s.id !== session.id)
  return [session, ...rest].sort((a, b) => b.updatedAt - a.updatedAt)
}

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
    const meta: WorkshopSessionMeta = {
      id: session.id,
      title: session.title,
      updatedAt: session.updatedAt,
    }
    const index = upsertMeta(await readIndex(root), meta)
    await writeFileAtomic(projectWorkshopFilePath(root, session.id), JSON.stringify(session))
    await writeIndex(root, index)
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
    const index = (await readIndex(root)).filter((s) => s.id !== workshopId)
    await writeIndex(root, index)
    await fs.rm(projectWorkshopFilePath(root, workshopId), { force: true })
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : '删除失败'
    return { ok: false, error: msg }
  }
}
