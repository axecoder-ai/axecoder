import type { AgentLoopMessage, AgentToolLogEntry, PendingWritePublic } from './agent-types'
import type { AgentContext } from './tool-executor'
import type { PendingWriteInternal } from './tool-executor'

export type StoredAgentSession = {
  projectRoot: string
  modelId: string
  messages: AgentLoopMessage[]
  ctx: AgentContext
  toolLog: AgentToolLogEntry[]
  pendingById: Map<string, PendingWriteInternal>
  turn: number
}

const sessions = new Map<string, StoredAgentSession>()
let sessionSeq = 0

export const createSessionId = () => `agent-${Date.now()}-${sessionSeq++}`

export const putSession = (id: string, session: StoredAgentSession) => {
  sessions.set(id, session)
}

export const getSession = (id: string) => sessions.get(id)

export const deleteSession = (id: string) => {
  sessions.delete(id)
}

export const pendingToPublic = (p: PendingWriteInternal): PendingWritePublic => ({
  id: p.id,
  tool: p.tool,
  filePath: p.filePath,
  summary: p.summary,
  patchText: p.patchText,
})
