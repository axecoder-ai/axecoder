import { ipcMain } from 'electron'
import fs from 'node:fs/promises'
import {
  ensureProjectSessionsDir,
  normalizeProjectRoot,
  projectSessionFilePath,
  projectSessionsIndexPath,
  resolveProjectSessionsDir,
} from './project-axecoder-dir'

export type ChatMessage = {
  role: 'user' | 'assistant'
  text: string
  thought?: string
}

export type ChatSessionMeta = {
  id: string
  title: string
  updatedAt: number
}

export type ChatSession = ChatSessionMeta & {
  messages: ChatMessage[]
}

type StoreResult = { ok: true } | { ok: false; error: string }

const writeFileAtomic = async (filePath: string, content: string) => {
  const tmp = `${filePath}.tmp.${process.pid}`
  await fs.writeFile(tmp, content, 'utf-8')
  await fs.rename(tmp, filePath)
}

const readIndex = async (projectRoot: string): Promise<ChatSessionMeta[]> => {
  try {
    const sessionsDir = await resolveProjectSessionsDir(projectRoot)
    const raw = await fs.readFile(projectSessionsIndexPath(projectRoot, sessionsDir), 'utf-8')
    const list = JSON.parse(raw) as ChatSessionMeta[]
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

const writeIndex = async (projectRoot: string, list: ChatSessionMeta[]) => {
  await ensureProjectSessionsDir(projectRoot)
  await writeFileAtomic(projectSessionsIndexPath(projectRoot), JSON.stringify(list))
}

const upsertMeta = (list: ChatSessionMeta[], session: ChatSessionMeta) => {
  const rest = list.filter((s) => s.id !== session.id)
  return [session, ...rest].sort((a, b) => b.updatedAt - a.updatedAt)
}

export const listChatSessions = async (projectRoot: string) => {
  const root = await normalizeProjectRoot(projectRoot)
  if (!root) return { sessions: [] as ChatSessionMeta[] }
  const sessions = await readIndex(root)
  return { sessions }
}

export const getChatSession = async (projectRoot: string, sessionId: string) => {
  const root = await normalizeProjectRoot(projectRoot)
  if (!root) return { session: null as ChatSession | null }
  try {
    const sessionsDir = await resolveProjectSessionsDir(root)
    const raw = await fs.readFile(projectSessionFilePath(root, sessionId, sessionsDir), 'utf-8')
    const session = JSON.parse(raw) as ChatSession
    if (!session?.id || !Array.isArray(session.messages)) return { session: null }
    return { session }
  } catch {
    return { session: null }
  }
}

export const saveChatSession = async (
  projectRoot: string,
  session: ChatSession,
): Promise<StoreResult> => {
  const root = await normalizeProjectRoot(projectRoot)
  if (!root) return { ok: false, error: '未打开项目' }
  if (!session?.id?.trim()) return { ok: false, error: '会话 id 无效' }
  try {
    await ensureProjectSessionsDir(root)
    const meta: ChatSessionMeta = {
      id: session.id,
      title: session.title,
      updatedAt: session.updatedAt,
    }
    const index = upsertMeta(await readIndex(root), meta)
    await writeFileAtomic(projectSessionFilePath(root, session.id), JSON.stringify(session))
    await writeIndex(root, index)
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : '保存失败'
    return { ok: false, error: msg }
  }
}

export const deleteChatSession = async (
  projectRoot: string,
  sessionId: string,
): Promise<StoreResult> => {
  const root = await normalizeProjectRoot(projectRoot)
  if (!root) return { ok: false, error: '未打开项目' }
  try {
    const index = (await readIndex(root)).filter((s) => s.id !== sessionId)
    await writeIndex(root, index)
    await fs.rm(projectSessionFilePath(root, sessionId), { force: true })
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : '删除失败'
    return { ok: false, error: msg }
  }
}

export const registerChatIpc = () => {
  ipcMain.handle('chat:getSessions', async (_, projectRoot: string) =>
    listChatSessions(typeof projectRoot === 'string' ? projectRoot : ''),
  )

  ipcMain.handle('chat:getSession', async (_, projectRoot: string, sessionId: string) =>
    getChatSession(typeof projectRoot === 'string' ? projectRoot : '', sessionId),
  )

  ipcMain.handle('chat:saveSession', async (_, projectRoot: string, session: ChatSession) =>
    saveChatSession(typeof projectRoot === 'string' ? projectRoot : '', session),
  )

  ipcMain.handle('chat:deleteSession', async (_, projectRoot: string, sessionId: string) =>
    deleteChatSession(typeof projectRoot === 'string' ? projectRoot : '', sessionId),
  )
}
