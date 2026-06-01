import type { ModelEntry } from '../models-types'
import { getModelById } from '../models-store'
import { getSecret } from '../secrets-store'
import { chatWithToolsForModel } from '../ai/chat-with-tools'
import { AGENT_TOOLS, buildAgentSystemPrompt } from './agent-tool-defs'
import type {
  AgentContinueResult,
  AgentLoopMessage,
  AgentSendResult,
  AgentToolLogEntry,
  PendingAskUserPublic,
  PendingBashPublic,
  PendingWritePublic,
} from './agent-types'
import {
  createSessionId,
  deleteSession,
  getSession,
  pendingAskToPublic,
  pendingBashToPublic,
  pendingToPublic,
  putSession,
  type StoredAgentSession,
} from './agent-session-store'
import { executeAgentTool, type AgentContext } from './tool-executor'
import { emitAgentProgress } from './agent-progress-emit'
import { getConfig } from '../config-store'

const MAX_TURNS = 12

const strArg = (args: Record<string, unknown>, key: string) => {
  const v = args[key]
  return typeof v === 'string' && v.trim() ? v.trim() : ''
}

const runModelStep = async (session: StoredAgentSession, sessionId: string) => {
  const model = await getModelById(session.modelId)
  if (!model) return { ok: false as const, error: '模型不存在' }
  const apiKey = await getSecret(session.modelId)
  const onDelta =
    model.provider === 'openai'
      ? (delta: { content?: string; reasoning?: string }) => {
          const text = (delta.content ?? '') + (delta.reasoning ?? '')
          if (text) {
            emitAgentProgress({ sessionId, kind: 'delta', delta: text })
          }
        }
      : undefined
  return chatWithToolsForModel(model, apiKey, session.messages, onDelta)
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

const applyAllPendingInSession = async (
  session: StoredAgentSession,
): Promise<{ ok: true } | { ok: false; error: string }> => {
  for (const pending of session.pendingById.values()) {
    const applied = await pending.apply()
    if (!applied.ok) return applied
    const toolMsg = session.messages.find(
      (m) => m.role === 'tool' && m.toolCallId === pending.toolCallId,
    )
    if (toolMsg && toolMsg.role === 'tool') {
      toolMsg.content = `Applied: ${pending.summary}`
    }
  }
  session.pendingById.clear()

  for (const pending of session.pendingBashById.values()) {
    const applied = await pending.apply()
    if (!applied.ok) return applied
    const toolMsg = session.messages.find(
      (m) => m.role === 'tool' && m.toolCallId === pending.toolCallId,
    )
    if (toolMsg && toolMsg.role === 'tool') {
      toolMsg.content = applied.content
    }
    const logEntry = session.toolLog.find(
      (e) => e.name === 'Bash' && e.summary === (pending.command.slice(0, 80) || 'Bash'),
    )
    if (logEntry) logEntry.ok = applied.logOk
  }
  session.pendingBashById.clear()

  return { ok: true }
}

const finishPending = (
  sessionId: string,
  session: StoredAgentSession,
  pending: PendingWritePublic[],
  pendingBashes: PendingBashPublic[],
  pendingAsks: PendingAskUserPublic[],
  assistantText: string,
  content?: string,
  reasoningContent?: string,
): AgentSendResult | AgentContinueResult => ({
  ok: true,
  status: 'pending',
  sessionId,
  pending,
  ...(pendingBashes.length ? { pendingBashes } : {}),
  ...(pendingAsks.length ? { pendingAsks } : {}),
  assistantText,
  toolLog: [...session.toolLog],
  ...replyMeta(content, reasoningContent),
})

const collectPendingPublic = (session: StoredAgentSession) => ({
  writes: [...session.pendingById.values()].map(pendingToPublic),
  bashes: [...session.pendingBashById.values()].map(pendingBashToPublic),
  asks: [...session.pendingAskById.values()].map(pendingAskToPublic),
})

const hasPendingInSession = (session: StoredAgentSession) =>
  session.pendingById.size > 0 ||
  session.pendingBashById.size > 0 ||
  session.pendingAskById.size > 0

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
    const res = await runModelStep(session, sessionId)
    if (!res.ok) return { ok: false, error: res.error }
    emitAgentProgress({
      sessionId,
      turn: session.turn,
      kind: 'model',
      status: 'done',
    })

    const assistantText = res.text.trim()
    if (res.toolCalls.length) {
      session.messages.push({
        role: 'assistant',
        content: res.content,
        reasoningContent: res.reasoningContent,
        toolCalls: res.toolCalls,
      })

      const pendingPublic: PendingWritePublic[] = []
      const pendingBashPublic: PendingBashPublic[] = []
      const pendingAskPublic: PendingAskUserPublic[] = []

      for (const tc of res.toolCalls) {
        const toolSummary =
          strArg(tc.arguments, 'file_path') ||
          strArg(tc.arguments, 'pattern') ||
          strArg(tc.arguments, 'command') ||
          tc.name
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
        } else if (run.kind === 'bash_pending') {
          session.pendingBashById.set(run.pendingBash.id, run.pendingBash)
          pendingBashPublic.push(pendingBashToPublic(run.pendingBash))
          session.messages.push({
            role: 'tool',
            toolCallId: tc.id,
            name: tc.name,
            content: 'Pending user approval to run this command.',
          })
        } else if (run.kind === 'ask_pending') {
          session.pendingAskById.set(run.pendingAsk.id, run.pendingAsk)
          pendingAskPublic.push(pendingAskToPublic(run.pendingAsk))
          session.messages.push({
            role: 'tool',
            toolCallId: tc.id,
            name: tc.name,
            content: 'Pending user answers to structured questions.',
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

      if (pendingPublic.length || pendingBashPublic.length || pendingAskPublic.length) {
        const cfg = await getConfig()
        if (cfg.agentAutoApplyWrites && !pendingAskPublic.length) {
          const applied = await applyAllPendingInSession(session)
          if (!applied.ok) return { ok: false, error: applied.error }
          continue
        }
        return finishPending(
          sessionId,
          session,
          pendingPublic,
          pendingBashPublic,
          pendingAskPublic,
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

  const cfg = await getConfig()

  const ctx: AgentContext = {
    projectRoot,
    readCache: new Set<string>(),
    modelId,
  }

  const messages: AgentLoopMessage[] = [
    {
      role: 'system',
      content: await buildAgentSystemPrompt(projectRoot, {
        modelId: model.modelId,
        enabledToolNames: AGENT_TOOLS.map((t) => t.name),
        outputStyleId: cfg.agentOutputStyle,
      }),
    },
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
    pendingBashById: new Map(),
    pendingAskById: new Map(),
    turn: 0,
  }
  putSession(sessionId, session)
  return runAgentLoopUntilDoneOrPending(sessionId, session)
}

const rejectAllPendingInSession = (
  session: StoredAgentSession,
  reason?: string,
) => {
  const rejectReason = reason?.trim() || 'User rejected all'
  for (const pending of session.pendingById.values()) {
    const toolMsg = session.messages.find(
      (m) => m.role === 'tool' && m.toolCallId === pending.toolCallId,
    )
    if (toolMsg && toolMsg.role === 'tool') {
      toolMsg.content = `Rejected by user: ${rejectReason}`
    }
  }
  session.pendingById.clear()

  for (const pending of session.pendingBashById.values()) {
    const toolMsg = session.messages.find(
      (m) => m.role === 'tool' && m.toolCallId === pending.toolCallId,
    )
    if (toolMsg && toolMsg.role === 'tool') {
      toolMsg.content = `Rejected by user: ${rejectReason}`
    }
  }
  session.pendingBashById.clear()
}

export const confirmAgentAllWrites = async (
  sessionId: string,
): Promise<AgentContinueResult> => {
  const session = getSession(sessionId)
  if (!session) return { ok: false, error: 'Session expired, please send again' }
  if (!hasPendingInSession(session)) {
    return { ok: false, error: 'No pending changes' }
  }

  const applied = await applyAllPendingInSession(session)
  if (!applied.ok) return { ok: false, error: applied.error }

  return runAgentLoopUntilDoneOrPending(sessionId, session)
}

export const rejectAgentAllWrites = async (
  sessionId: string,
  reason?: string,
): Promise<AgentContinueResult> => {
  const session = getSession(sessionId)
  if (!session) return { ok: false, error: 'Session expired, please send again' }
  if (!hasPendingInSession(session)) {
    return { ok: false, error: 'No pending changes' }
  }

  rejectAllPendingInSession(session, reason)
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

  const { writes, bashes, asks } = collectPendingPublic(session)
  if (writes.length || bashes.length || asks.length) {
    return finishPending(sessionId, session, writes, bashes, asks, '')
  }

  return runAgentLoopUntilDoneOrPending(sessionId, session)
}

export const confirmAgentBash = async (
  sessionId: string,
  pendingId: string,
): Promise<AgentContinueResult> => {
  const session = getSession(sessionId)
  if (!session) return { ok: false, error: '会话已过期，请重新发送' }
  const pending = session.pendingBashById.get(pendingId)
  if (!pending) return { ok: false, error: '找不到待确认的命令' }

  const applied = await pending.apply()
  session.pendingBashById.delete(pendingId)
  if (!applied.ok) return { ok: false, error: applied.error }

  const toolMsg = session.messages.find(
    (m) => m.role === 'tool' && m.toolCallId === pending.toolCallId,
  )
  if (toolMsg && toolMsg.role === 'tool') {
    toolMsg.content = applied.content
  }
  const logEntry = session.toolLog.find(
    (e) => e.name === 'Bash' && e.summary === (pending.command.slice(0, 80) || 'Bash'),
  )
  if (logEntry) logEntry.ok = applied.logOk

  const { writes, bashes, asks } = collectPendingPublic(session)
  if (writes.length || bashes.length || asks.length) {
    return finishPending(sessionId, session, writes, bashes, asks, '')
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
    toolMsg.content = `Rejected by user: ${reason?.trim() || 'User rejected'}`
  }

  const { writes, bashes, asks } = collectPendingPublic(session)
  if (writes.length || bashes.length || asks.length) {
    return finishPending(sessionId, session, writes, bashes, asks, '')
  }

  return runAgentLoopUntilDoneOrPending(sessionId, session)
}

export const rejectAgentBash = async (
  sessionId: string,
  pendingId: string,
  reason?: string,
): Promise<AgentContinueResult> => {
  const session = getSession(sessionId)
  if (!session) return { ok: false, error: '会话已过期，请重新发送' }
  const pending = session.pendingBashById.get(pendingId)
  if (!pending) return { ok: false, error: '找不到待确认的命令' }

  session.pendingBashById.delete(pendingId)
  const toolMsg = session.messages.find(
    (m) => m.role === 'tool' && m.toolCallId === pending.toolCallId,
  )
  if (toolMsg && toolMsg.role === 'tool') {
    toolMsg.content = `Rejected by user: ${reason?.trim() || 'User rejected'}`
  }

  const { writes, bashes, asks } = collectPendingPublic(session)
  if (writes.length || bashes.length || asks.length) {
    return finishPending(sessionId, session, writes, bashes, asks, '')
  }

  return runAgentLoopUntilDoneOrPending(sessionId, session)
}

const validateAskAnswers = (
  questions: { id: string; allow_multiple?: boolean }[],
  answers: Record<string, unknown>,
): { ok: true } | { ok: false; error: string } => {
  for (const q of questions) {
    const raw = answers[q.id]
    if (raw === undefined || raw === null || raw === '') {
      return { ok: false, error: `Missing answer for question "${q.id}"` }
    }
    if (q.allow_multiple) {
      if (!Array.isArray(raw) || raw.length === 0 || raw.some((v) => typeof v !== 'string')) {
        return { ok: false, error: `Question "${q.id}" requires a non-empty array of option ids` }
      }
    } else if (typeof raw !== 'string') {
      return { ok: false, error: `Question "${q.id}" requires a single option id string` }
    }
  }
  return { ok: true }
}

export const answerAgentQuestions = async (
  sessionId: string,
  pendingId: string,
  answers: Record<string, string | string[]>,
): Promise<AgentContinueResult> => {
  const session = getSession(sessionId)
  if (!session) return { ok: false, error: '会话已过期，请重新发送' }
  const pending = session.pendingAskById.get(pendingId)
  if (!pending) return { ok: false, error: '找不到待回答的问题' }

  const valid = validateAskAnswers(pending.questions, answers)
  if (!valid.ok) return { ok: false, error: valid.error }

  session.pendingAskById.delete(pendingId)
  const toolMsg = session.messages.find(
    (m) => m.role === 'tool' && m.toolCallId === pending.toolCallId,
  )
  if (toolMsg && toolMsg.role === 'tool') {
    toolMsg.content = JSON.stringify({ answers })
  }

  const { writes, bashes, asks } = collectPendingPublic(session)
  if (writes.length || bashes.length || asks.length) {
    return finishPending(sessionId, session, writes, bashes, asks, '')
  }

  return runAgentLoopUntilDoneOrPending(sessionId, session)
}

export const modelSupportsAgentTools = (model: ModelEntry | null | undefined) =>
  !!model && model.provider !== 'ollama'
