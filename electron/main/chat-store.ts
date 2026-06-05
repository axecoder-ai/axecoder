import { ipcMain } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import {
  ensureProjectSessionsDir,
  normalizeProjectRoot,
  projectSessionFilePath,
  resolveProjectSessionsDir,
} from './project-axecoder-dir'
import {
  listRegistryByKind,
  readRegistry,
  removeRegistryEntry,
  upsertRegistryEntry,
  writeRegistry,
} from './session/session-registry'
import type { SessionRegistryEntry } from './session/session-types'
import { t } from './i18n'

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
  await fs.mkdir(path.dirname(filePath), { recursive: true })
  const tmp = `${filePath}.tmp.${process.pid}.${Date.now()}.${Math.random().toString(36).slice(2, 8)}`
  await fs.writeFile(tmp, content, 'utf-8')
  await fs.rename(tmp, filePath)
}

const registryToChatMeta = (list: SessionRegistryEntry[]): ChatSessionMeta[] =>
  list
    .filter((s) => s.kind === 'agent')
    .map(({ id, title, updatedAt }) => ({ id, title, updatedAt }))

const readIndex = async (projectRoot: string): Promise<ChatSessionMeta[]> =>
  registryToChatMeta(await listRegistryByKind(projectRoot, 'agent'))

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
  if (!root) return { ok: false, error: t('errors.noProject') }
  if (!session?.id?.trim()) return { ok: false, error: t('errors.invalidSessionId') }
  try {
    await ensureProjectSessionsDir(root)
    const meta: SessionRegistryEntry = {
      id: session.id,
      title: session.title,
      updatedAt: session.updatedAt,
      kind: 'agent',
    }
    const index = upsertRegistryEntry(await readRegistry(root), meta)
    await writeFileAtomic(projectSessionFilePath(root, session.id), JSON.stringify(session))
    await writeRegistry(root, index)
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : t('common.saveFailed')
    return { ok: false, error: msg }
  }
}

export const deleteChatSession = async (
  projectRoot: string,
  sessionId: string,
): Promise<StoreResult> => {
  const root = await normalizeProjectRoot(projectRoot)
  if (!root) return { ok: false, error: t('errors.noProject') }
  try {
    const index = removeRegistryEntry(await readRegistry(root), sessionId, 'agent')
    await writeRegistry(root, index)
    await fs.rm(projectSessionFilePath(root, sessionId), { force: true })
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : t('errors.deleteFailed')
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
