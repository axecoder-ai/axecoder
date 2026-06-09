import fs from 'node:fs/promises'
import path from 'node:path'
import type { ChatMessage, ChatSession } from './chat-store'
import { getChatSession, saveChatSession } from './chat-store'
import { listRegistryByKind } from './session/session-registry'
import { normalizeProjectRoot, projectSessionFilePath } from './project-axecoder-dir'

export type BranchMeta = {
  id: string
  name?: string
  parentId?: string
  forkTurn?: number
  forkMessageIndex?: number
  createdAt: number
  updatedAt: number
}

export type BranchInfo = BranchMeta & {
  title: string
  messageCount: number
  preview: string
}

const metaPathFor = (projectRoot: string, sessionId: string) =>
  `${projectSessionFilePath(projectRoot, sessionId)}.meta.json`

const readMeta = async (projectRoot: string, sessionId: string): Promise<BranchMeta | null> => {
  try {
    const raw = await fs.readFile(metaPathFor(projectRoot, sessionId), 'utf-8')
    const m = JSON.parse(raw) as BranchMeta
    if (!m?.id) return null
    return m
  } catch {
    return null
  }
}

const writeMeta = async (projectRoot: string, meta: BranchMeta) => {
  const p = metaPathFor(projectRoot, meta.id)
  await fs.mkdir(path.dirname(p), { recursive: true })
  await fs.writeFile(p, JSON.stringify(meta, null, 2), 'utf-8')
}

const newSessionId = () => `chat-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

const previewOf = (messages: ChatMessage[]): string => {
  for (const m of messages) {
    const t = m.text?.trim()
    if (t) return t.length > 60 ? `${t.slice(0, 57)}...` : t
  }
  return '(empty)'
}

/** 第 turn 条 user 消息在 messages 中的起始下标；turn 从 1 起 */
export const messageIndexAtUserTurn = (messages: ChatMessage[], turn: number): number => {
  if (turn <= 1) return 0
  let users = 0
  for (let i = 0; i < messages.length; i++) {
    if (messages[i].role === 'user') {
      users += 1
      if (users === turn) return i
    }
  }
  return messages.length
}

export const parseBranchArgs = (
  args: string,
): { fromTurn: boolean; turn: number; name: string } => {
  const parts = args.trim().split(/\s+/).filter(Boolean)
  if (!parts.length) return { fromTurn: false, turn: 0, name: '' }
  const first = parts[0]
  const n = Number(first)
  if (Number.isFinite(n) && n >= 1) {
    return { fromTurn: true, turn: Math.floor(n), name: parts.slice(1).join(' ').trim() }
  }
  return { fromTurn: false, turn: 0, name: args.trim() }
}

export const listChatBranches = async (
  projectRoot: string,
): Promise<{ ok: true; branches: BranchInfo[] } | { ok: false; error: string }> => {
  const root = await normalizeProjectRoot(projectRoot)
  if (!root) return { ok: false, error: 'No project open' }
  const entries = await listRegistryByKind(root, 'agent')
  const branches: BranchInfo[] = []
  for (const e of entries) {
    const { session } = await getChatSession(root, e.id)
    if (!session) continue
    const meta =
      (await readMeta(root, e.id)) ??
      ({
        id: e.id,
        createdAt: e.updatedAt,
        updatedAt: e.updatedAt,
      } satisfies BranchMeta)
    branches.push({
      ...meta,
      id: e.id,
      title: e.title,
      messageCount: session.messages.length,
      preview: previewOf(session.messages),
    })
  }
  branches.sort((a, b) => b.updatedAt - a.updatedAt)
  return { ok: true, branches }
}

export const forkChatBranch = async (
  projectRoot: string,
  sourceSessionId: string,
  opts: { forkMessageIndex?: number; name?: string },
): Promise<{ ok: true; session: ChatSession } | { ok: false; error: string }> => {
  const root = await normalizeProjectRoot(projectRoot)
  if (!root) return { ok: false, error: 'No project open' }
  const { session: source } = await getChatSession(root, sourceSessionId)
  if (!source) return { ok: false, error: 'Session not found' }

  const idx =
    opts.forkMessageIndex !== undefined
      ? Math.min(Math.max(0, opts.forkMessageIndex), source.messages.length)
      : source.messages.length
  const forkedMessages = source.messages.slice(0, idx).map((m) => ({ ...m }))

  const now = Date.now()
  const id = newSessionId()
  const branchName = opts.name?.trim()
  const title = branchName || `Branch of ${source.title}`
  const session: ChatSession = {
    id,
    title,
    updatedAt: now,
    messages: forkedMessages,
  }
  const saveRes = await saveChatSession(root, session)
  if (!saveRes.ok) return { ok: false, error: saveRes.error }

  await writeMeta(root, {
    id,
    name: branchName || undefined,
    parentId: sourceSessionId,
    forkTurn: opts.forkMessageIndex !== undefined ? undefined : -1,
    forkMessageIndex: idx,
    createdAt: now,
    updatedAt: now,
  })

  return { ok: true, session }
}

export const resolveBranchRef = (branches: BranchInfo[], ref: string): BranchInfo | null => {
  const q = ref.trim().toLowerCase()
  if (!q) return null
  const exact = branches.find((b) => b.id === ref || b.id.toLowerCase() === q)
  if (exact) return exact
  const byName = branches.filter((b) => b.name && b.name.toLowerCase() === q)
  if (byName.length === 1) return byName[0]
  const prefix = branches.filter(
    (b) => b.id.toLowerCase().startsWith(q) || b.id.toLowerCase().includes(q),
  )
  if (prefix.length === 1) return prefix[0]
  return null
}

export const formatBranchTree = (branches: BranchInfo[], currentId?: string): string => {
  if (!branches.length) return 'No conversation branches yet. Use /branch to fork the current chat.'
  const lines = ['branches:']
  for (const b of branches) {
    const tag = b.id === currentId ? '  current' : ''
    const label = b.name?.trim() || b.title
    lines.push(`  ├─ ${b.id}  ${label}  ${b.messageCount} msgs${tag}`)
  }
  return lines.join('\n')
}
