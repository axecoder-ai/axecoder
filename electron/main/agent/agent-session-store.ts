import type {
  AgentLoopMessage,
  AgentToolLogEntry,
  PendingAskUserPublic,
  PendingBashPublic,
  PendingWritePublic,
} from './agent-types'
import type {
  AgentContext,
  PendingAskUserInternal,
  PendingBashInternal,
  PendingWriteInternal,
} from './tool-executor'

export type StoredAgentSession = {
  projectRoot: string
  modelId: string
  messages: AgentLoopMessage[]
  ctx: AgentContext
  toolLog: AgentToolLogEntry[]
  pendingById: Map<string, PendingWriteInternal>
  pendingBashById: Map<string, PendingBashInternal>
  pendingAskById: Map<string, PendingAskUserInternal>
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

export const pendingAskToPublic = (p: PendingAskUserInternal): PendingAskUserPublic => ({
  id: p.id,
  questions: p.questions,
})

export const pendingBashToPublic = (p: PendingBashInternal): PendingBashPublic => ({
  id: p.id,
  command: p.command,
  ...(p.timeoutMs !== undefined ? { timeoutMs: p.timeoutMs } : {}),
})
