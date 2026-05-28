import type { ModelEntry } from '../models-types'
import { getModelById } from '../models-store'
import { getSecret } from '../secrets-store'
import { chatWithToolsForModel } from '../ai/chat-with-tools'
import { buildAgentSystemPrompt } from './agent-tool-defs'
import type {
  AgentContinueResult,
  AgentLoopMessage,
  AgentSendResult,
  AgentToolLogEntry,
  PendingWritePublic,
} from './agent-types'
import {
  createSessionId,
  deleteSession,
  getSession,
  pendingToPublic,
  putSession,
  type StoredAgentSession,
} from './agent-session-store'
import { executeAgentTool, type AgentContext } from './tool-executor'
import { emitAgentProgress } from './agent-progress-emit'

const MAX_TURNS = 12

const strArg = (args: Record<string, unknown>, key: string) => {
  const v = args[key]
  return typeof v === 'string' && v.trim() ? v.trim() : ''
}

const runModelStep = async (session: StoredAgentSession) => {
  const model = await getModelById(session.modelId)
  if (!model) return { ok: false as const, error: '模型不存在' }
  const apiKey = await getSecret(session.modelId)
  return chatWithToolsForModel(model, apiKey, session.messages)
}

const replyMeta = (content?: string, reasoningContent?: string) => ({
  ...(content !== undefined ? { assistantContent: content } : {}),
  ...(reasoningContent ? { reasoningContent } : {}),
})

const finishDone = (
  session: StoredAgentSession,
  assistantText: string,
  sessionId?: string,
  content?: string,
  reasoningContent?: string,
): AgentSendResult | AgentContinueResult => {
  const toolLog = [...session.toolLog]
  if (sessionId) deleteSession(sessionId)
  return { ok: true, status: 'done', assistantText, toolLog, ...replyMeta(content, reasoningContent) }
}

const finishPending = (
  sessionId: string,
  session: StoredAgentSession,
  pending: PendingWritePublic[],
  assistantText: string,
  content?: string,
  reasoningContent?: string,
): AgentSendResult | AgentContinueResult => ({
  ok: true,
  status: 'pending',
  sessionId,
  pending,
  assistantText,
  toolLog: [...session.toolLog],
  ...replyMeta(content, reasoningContent),
})

export const runAgentLoopUntilDoneOrPending = async (
  sessionId: string,
  session: StoredAgentSession,
): Promise<AgentSendResult | AgentContinueResult> => {
  while (session.turn < MAX_TURNS) {
    session.turn += 1
    emitAgentProgress({
      sessionId,
      turn: session.turn,
      kind: 'model',
      status: 'start',
    })
    const res = await runModelStep(session)
    if (!res.ok) return { ok: false, error: res.error }

    const assistantText = res.text.trim()
    if (res.toolCalls.length) {
      session.messages.push({
        role: 'assistant',
        content: res.content,
        reasoningContent: res.reasoningContent,
        toolCalls: res.toolCalls,
      })

      const pendingPublic: PendingWritePublic[] = []

      for (const tc of res.toolCalls) {
        const toolSummary = strArg(tc.arguments, 'file_path') || strArg(tc.arguments, 'pattern') || tc.name
        emitAgentProgress({
          sessionId,
          turn: session.turn,
          kind: 'tool',
          status: 'start',
          toolName: tc.name,
          summary: toolSummary,
        })
        const run = await executeAgentTool(session.ctx, tc)
        session.toolLog.push(run.log)
        emitAgentProgress({
          sessionId,
          turn: session.turn,
          kind: 'tool',
          status: 'done',
          toolName: run.log.name,
          summary: run.log.summary,
          ok: run.log.ok,
        })

        if (run.kind === 'pending') {
          session.pendingById.set(run.pending.id, run.pending)
          pendingPublic.push(pendingToPublic(run.pending))
          session.messages.push({
            role: 'tool',
            toolCallId: tc.id,
            name: tc.name,
            content: 'Pending user approval for this change.',
          })
        } else {
          session.messages.push({
            role: 'tool',
            toolCallId: tc.id,
            name: tc.name,
            content: run.content,
          })
        }
      }

      if (pendingPublic.length) {
        return finishPending(
          sessionId,
          session,
          pendingPublic,
          assistantText,
          res.content,
          res.reasoningContent,
        )
      }
      continue
    }

    return finishDone(
      session,
      assistantText || '（模型未返回内容）',
      sessionId,
      res.content,
      res.reasoningContent,
    )
  }
  return { ok: false, error: `Agent 超过最大轮数 ${MAX_TURNS}` }
}

export const startAgentTurn = async (
  projectRoot: string,
  modelId: string,
  history: { role: 'user' | 'assistant'; content: string; reasoningContent?: string }[],
): Promise<AgentSendResult> => {
  if (!projectRoot.trim()) return { ok: false, error: '请先打开项目' }
  const model = await getModelById(modelId)
  if (!model) return { ok: false, error: '模型不存在' }
  if (model.provider === 'ollama') {
    return { ok: false, error: 'Ollama 暂不支持 Agent 文件工具，请使用 OpenAI 或 Anthropic' }
  }

  const ctx: AgentContext = {
    projectRoot,
    readCache: new Set<string>(),
  }

  const messages: AgentLoopMessage[] = [
    { role: 'system', content: buildAgentSystemPrompt(projectRoot) },
  ]
  for (const m of history) {
    if (m.role === 'user') {
      messages.push({ role: 'user', content: m.content })
    } else if (m.role === 'assistant') {
      messages.push({
        role: 'assistant',
        content: m.content,
        ...(m.reasoningContent ? { reasoningContent: m.reasoningContent } : {}),
      })
    }
  }

  const sessionId = createSessionId()
  const session: StoredAgentSession = {
    projectRoot,
    modelId,
    messages,
    ctx,
    toolLog: [],
    pendingById: new Map(),
    turn: 0,
  }
  putSession(sessionId, session)
  return runAgentLoopUntilDoneOrPending(sessionId, session)
}

export const confirmAgentWrite = async (
  sessionId: string,
  pendingId: string,
): Promise<AgentContinueResult> => {
  const session = getSession(sessionId)
  if (!session) return { ok: false, error: '会话已过期，请重新发送' }
  const pending = session.pendingById.get(pendingId)
  if (!pending) return { ok: false, error: '找不到待确认的变更' }

  const applied = await pending.apply()
  session.pendingById.delete(pendingId)
  if (!applied.ok) return { ok: false, error: applied.error }

  const toolMsg = session.messages.find(
    (m) => m.role === 'tool' && m.toolCallId === pending.toolCallId,
  )
  if (toolMsg && toolMsg.role === 'tool') {
    toolMsg.content = `Applied: ${pending.summary}`
  }

  if (session.pendingById.size > 0) {
    const rest = [...session.pendingById.values()].map(pendingToPublic)
    return finishPending(sessionId, session, rest, '')
  }

  return runAgentLoopUntilDoneOrPending(sessionId, session)
}

export const rejectAgentWrite = async (
  sessionId: string,
  pendingId: string,
  reason?: string,
): Promise<AgentContinueResult> => {
  const session = getSession(sessionId)
  if (!session) return { ok: false, error: '会话已过期，请重新发送' }
  const pending = session.pendingById.get(pendingId)
  if (!pending) return { ok: false, error: '找不到待确认的变更' }

  session.pendingById.delete(pendingId)
  const toolMsg = session.messages.find(
    (m) => m.role === 'tool' && m.toolCallId === pending.toolCallId,
  )
  if (toolMsg && toolMsg.role === 'tool') {
    toolMsg.content = `Rejected by user: ${reason?.trim() || '用户拒绝'}`
  }

  if (session.pendingById.size > 0) {
    const rest = [...session.pendingById.values()].map(pendingToPublic)
    return finishPending(sessionId, session, rest, '')
  }

  return runAgentLoopUntilDoneOrPending(sessionId, session)
}

export const modelSupportsAgentTools = (model: ModelEntry | null | undefined) =>
  !!model && model.provider !== 'ollama'
