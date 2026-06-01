import fs from 'node:fs/promises'
import path from 'node:path'
import type { AgentLoopMessage } from './agent-types'
import type { StoredAgentSession } from './agent-session-store'
import { resolvePathInProject } from './agent-path'
import { writeProjectFile } from './agent-fs'
import type { AgentContext } from './tool-executor'

const MAX_CHECKPOINTS = 20
const MAX_FILE_BYTES = 512 * 1024

export type AgentCheckpointMeta = {
  id: string
  turn: number
  label: string
  createdAt: number
  fileCount: number
}

export type AgentCheckpoint = AgentCheckpointMeta & {
  messages: AgentLoopMessage[]
  files: Record<string, string>
}

const bySession = new Map<string, AgentCheckpoint[]>()
let cpSeq = 0

const cloneMessages = (messages: AgentLoopMessage[]): AgentLoopMessage[] =>
  JSON.parse(JSON.stringify(messages)) as AgentLoopMessage[]

export const trackCheckpointFileCtx = (
  ctx: AgentContext,
  relPath: string,
  content: string,
) => {
  if (!ctx.checkpointFiles) ctx.checkpointFiles = {}
  if (Buffer.byteLength(content, 'utf-8') > MAX_FILE_BYTES) return
  ctx.checkpointFiles[relPath] = content
}

export const pushAgentCheckpoint = (sessionId: string, session: StoredAgentSession) => {
  const files = { ...(session.ctx.checkpointFiles ?? {}) }
  session.ctx.checkpointFiles = {}
  const id = `cp-${Date.now()}-${cpSeq++}`
  const cp: AgentCheckpoint = {
    id,
    turn: session.turn,
    label: `第 ${session.turn} 轮开始前`,
    createdAt: Date.now(),
    fileCount: Object.keys(files).length,
    messages: cloneMessages(session.messages),
    files,
  }
  const list = bySession.get(sessionId) ?? []
  list.push(cp)
  while (list.length > MAX_CHECKPOINTS) list.shift()
  bySession.set(sessionId, list)
  return cp
}

export const listAgentCheckpoints = (sessionId: string): AgentCheckpointMeta[] => {
  const list = bySession.get(sessionId) ?? []
  return list.map(({ id, turn, label, createdAt, fileCount }) => ({
    id,
    turn,
    label,
    createdAt,
    fileCount,
  }))
}

export const rewindAgentCheckpoint = async (
  sessionId: string,
  session: StoredAgentSession,
  checkpointId?: string,
): Promise<{ ok: true; label: string; restoredFiles: number } | { ok: false; error: string }> => {
  const list = bySession.get(sessionId) ?? []
  if (!list.length) return { ok: false, error: '无可用 checkpoint' }
  const cp = checkpointId
    ? list.find((c) => c.id === checkpointId)
    : list[list.length - 1]
  if (!cp) return { ok: false, error: '找不到 checkpoint' }

  session.messages = cloneMessages(cp.messages)
  session.turn = cp.turn
  let restoredFiles = 0
  for (const [rel, content] of Object.entries(cp.files)) {
    const resolved = resolvePathInProject(session.projectRoot, rel)
    if (!resolved) continue
    try {
      await writeProjectFile(resolved, content)
      restoredFiles += 1
    } catch {
      /* skip */
    }
  }
  const idx = list.findIndex((c) => c.id === cp.id)
  if (idx >= 0) list.splice(idx + 1)
  return { ok: true, label: cp.label, restoredFiles }
}

export const clearAgentCheckpoints = (sessionId: string) => {
  bySession.delete(sessionId)
}

export const readMemoryFile = async (memoryPath: string) => {
  try {
    const text = await fs.readFile(memoryPath, 'utf-8')
    return { ok: true as const, text }
  } catch (e) {
    const err = e as NodeJS.ErrnoException
    if (err.code === 'ENOENT') return { ok: true as const, text: '' }
    return { ok: false as const, error: String(err.message ?? e) }
  }
}

export const writeMemoryFile = async (memoryPath: string, text: string) => {
  try {
    await fs.mkdir(path.dirname(memoryPath), { recursive: true })
    await fs.writeFile(memoryPath, text, 'utf-8')
    return { ok: true as const }
  } catch (e) {
    return { ok: false as const, error: String(e) }
  }
}

export const AGENTS_MD_TEMPLATE = `# AGENTS.md

## 项目说明

（在此描述本仓库的目标、目录结构与约定。）

## Agent 指引

- 优先最小改动
- 修改前先 Read 相关文件
- 测试：\`npm test\`
`
