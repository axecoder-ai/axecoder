import type {
  AgentLoopMessage,
  AgentToolDef,
  AgentToolLogEntry,
  AgentToolName,
  AgentTurnFileChange,
  PendingAskUserPublic,
  PendingBashPublic,
  PendingPlanPublic,
  PendingSmartApprovalPublic,
  PendingWritePublic,
} from './agent-types'
import type { ChatModeId } from './chat-mode'
import type {
  AgentContext,
  PendingAskUserInternal,
  PendingBashInternal,
  PendingPlanInternal,
  PendingWriteInternal,
} from './tool-executor'
import type { PendingSmartApprovalInternal } from './agent-smart-review'
import { createLoopGuardState, type LoopGuardState } from './agent-loop-guard'

export type StoredAgentSession = {
  projectRoot: string
  modelId: string
  messages: AgentLoopMessage[]
  ctx: AgentContext
  toolLog: AgentToolLogEntry[]
  pendingById: Map<string, PendingWriteInternal>
  pendingBashById: Map<string, PendingBashInternal>
  pendingAskById: Map<string, PendingAskUserInternal>
  pendingPlanById: Map<string, PendingPlanInternal>
  pendingSmartById: Map<string, PendingSmartApprovalInternal>
  turn: number
  planMode: boolean
  chatMode: ChatModeId
  revealedToolNames: Set<AgentToolName>
  activeTools: AgentToolDef[]
  proactiveEnabled: boolean
  proactiveTick: number
  scratchpadDir: string
  compactedOnce: boolean
  /** 多轮 compact 滚动摘要，供下次合并 */
  rollingCompactSummary?: string
  /** Agent @角色：本轮以该 Users 成员 persona 回复 */
  assigneeUserId?: string
  /** 最近一次 Bash 创建的 PR/MR URL */
  linkedPrUrl?: string
  /** 用户请求Stop Agent 循环 */
  abortRequested?: boolean
  /** Loop guard：防呆状态（storm / repeat / tool rounds） */
  loopGuard: LoopGuardState
  /** 推理力度（OpenAI reasoning_effort） */
  reasoningEffort?: import('../../../shared/reasoning-effort').ReasoningEffortLevel
  /** 渲染进程 chat session id，用于多 Tab 并发 progress 路由 */
  clientChatId?: string
  /** 本轮 Agent 改动的文件（用于聊天栏文件列表） */
  turnFileChanges: AgentTurnFileChange[]
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

export const listAgentSessions = () =>
  [...sessions.entries()].map(([id, s]) => ({
    id,
    turn: s.turn,
    projectRoot: s.projectRoot,
    modelId: s.modelId,
    messageCount: s.messages.length,
  }))

export const pendingToPublic = (p: PendingWriteInternal): PendingWritePublic => ({
  id: p.id,
  tool: p.tool,
  filePath: p.filePath,
  summary: p.summary,
  patchText: p.patchText,
  ...(p.batchFiles?.length ? { batchFiles: p.batchFiles } : {}),
})

export const pendingPlanToPublic = (p: PendingPlanInternal): PendingPlanPublic => ({
  id: p.id,
  name: p.name,
  overview: p.overview,
  plan: p.plan,
  filePath: p.filePath,
  ...(p.todos?.length ? { todos: p.todos } : {}),
})

export const pendingAskToPublic = (p: PendingAskUserInternal): PendingAskUserPublic => ({
  id: p.id,
  questions: p.questions,
})

export const pendingBashToPublic = (p: PendingBashInternal): PendingBashPublic => ({
  id: p.id,
  command: p.command,
  ...(p.timeoutMs !== undefined ? { timeoutMs: p.timeoutMs } : {}),
  ...(p.description ? { description: p.description } : {}),
  ...(p.runInBackground ? { runInBackground: true } : {}),
})

export const pendingSmartToPublic = (
  p: PendingSmartApprovalInternal,
): PendingSmartApprovalPublic => ({
  id: p.id,
  toolName: p.toolName,
  blockReason: p.blockReason,
  summary: p.summary,
  detail: p.detail,
})
