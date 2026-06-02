import type { ModelEntry } from '../models-types'
import { getModelById } from '../models-store'
import { getSecret } from '../secrets-store'
import { chatWithToolsForModel } from '../ai/chat-with-tools'
import { resolveApiModelIdForTask } from '../ai/api-model-resolve'
import { AGENT_TOOLS, buildAgentSystemPrompt, buildFullAgentTools } from './agent-tool-defs'
import { getSessionActiveTools } from './agent-ext-executor'
import type { AgentToolCall } from './agent-types'
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
  clearAgentCheckpoints,
  pushAgentCheckpoint,
  rewindAgentCheckpoint,
} from './agent-checkpoint'
import {
  createSessionId,
  deleteSession,
  getSession,
  listAgentSessions,
  pendingAskToPublic,
  pendingBashToPublic,
  pendingToPublic,
  putSession,
  type StoredAgentSession,
} from './agent-session-store'
import { executeAgentTool, type AgentContext, type ToolRunResult } from './tool-executor'
import { emitAgentProgress } from './agent-progress-emit'
import { getConfig } from '../config-store'
import { resolveToolPermission } from './agent-permissions'
import { runHooks } from './agent-hooks'
import { clearOldToolResults, dropOrphanToolMessages } from './agent-frc'
import { compactAgentMessages, shouldAutoCompact } from './agent-context-compact'
import { getTokenBudgetSection } from './agent-token-budget'
import { maybeInjectProactiveReminder } from './agent-proactive'
import { ensureScratchpadDir } from './agent-scratchpad'
import { buildAgentContextInjections } from './agent-context-inject'
import {
  abortAgentRun,
  bindAgentRunAbort,
  clearAgentRunAbort,
  getAgentRunAbortSignal,
} from './agent-run-abort'
import { refreshCustomOutputStylesCache } from './agent-output-styles-custom'
import type { AgentToolName } from './agent-types'

export { compactAgentMessages } from './agent-context-compact'
export { runUserShellCommand } from './agent-user-shell'
export { formatHooksHelp } from './agent-hooks'

const strArg = (args: Record<string, unknown>, key: string) => {
  const v = args[key]
  return typeof v === 'string' && v.trim() ? v.trim() : ''
}

const lastUserTextFromMessages = (messages: StoredAgentSession['messages']): string => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m?.role === 'user' && 'content' in m) {
      const c = m.content
      return typeof c === 'string' ? c : ''
    }
  }
  return ''
}

const runModelStep = async (session: StoredAgentSession, sessionId: string) => {
  const model = await getModelById(session.modelId)
  if (!model) return { ok: false as const, error: '模型不存在' }
  const apiKey = await getSecret(session.modelId)
  const apiModelId = await resolveApiModelIdForTask(
    model,
    'main',
    lastUserTextFromMessages(session.messages),
  )
  const onDelta =
    model.provider === 'openai'
      ? (delta: { content?: string; reasoning?: string }) => {
          const text = (delta.content ?? '') + (delta.reasoning ?? '')
          if (text) {
            emitAgentProgress({ sessionId, kind: 'delta', delta: text })
          }
        }
      : undefined
  return chatWithToolsForModel(
    model,
    apiKey,
    session.messages,
    onDelta,
    session.activeTools,
    getAgentRunAbortSignal(sessionId),
    apiModelId,
  )
}

const refreshSessionActiveTools = (session: StoredAgentSession) => {
  session.activeTools = getSessionActiveTools(buildFullAgentTools(), session.revealedToolNames)
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

const stripBudgetReminders = (messages: AgentLoopMessage[]) =>
  messages.filter((m) => !(m.role === 'user' && m.content.includes('Context budget:')))

const stripContextInjectReminders = (messages: AgentLoopMessage[]) =>
  messages.filter(
    (m) => !(m.role === 'user' && m.content.includes('<agent-context-injection>')),
  )

const prepareSessionBeforeModel = async (sessionId: string, session: StoredAgentSession) => {
  const cfg = await getConfig()
  clearOldToolResults(session.messages, cfg.agentFrcKeepToolMessages ?? 8)
  const threshold = cfg.agentContextCompactThreshold ?? 120_000
  if (shouldAutoCompact(session.messages, threshold)) {
    const compacted = compactAgentMessages(session.messages)
    session.messages = compacted.messages
    session.compactedOnce = true
  }
  session.messages = dropOrphanToolMessages(session.messages)
  session.messages = stripBudgetReminders(session.messages)
  session.messages = stripContextInjectReminders(session.messages)
  const budget = getTokenBudgetSection(cfg, session.messages)
  if (budget) {
    session.messages.push({
      role: 'user',
      content: `<system-reminder>\n${budget}\n</system-reminder>`,
    })
  }
  const injectBlocks = await buildAgentContextInjections(sessionId)
  if (injectBlocks.length) {
    session.messages.push({
      role: 'user',
      content: `<system-reminder>\n<agent-context-injection>\n${injectBlocks.join('\n\n---\n\n')}\n</agent-context-injection>\n</system-reminder>`,
    })
  }
  maybeInjectProactiveReminder(session)
}

const applyPendingToolRun = async (
  session: StoredAgentSession,
  run: ToolRunResult,
): Promise<{ ok: true; content: string; logOk: boolean } | { ok: false; error: string }> => {
  if (run.kind === 'pending') {
    const applied = await run.pending.apply()
    if (!applied.ok) return applied
    return { ok: true, content: `Applied: ${run.pending.summary}`, logOk: true }
  }
  if (run.kind === 'bash_pending') {
    const applied = await run.pendingBash.apply()
    if (!applied.ok) return applied
    return { ok: true, content: applied.content, logOk: applied.logOk }
  }
  return { ok: false, error: 'Not a pending tool run' }
}

const finishAbortedAgent = (
  sessionId: string,
  session: StoredAgentSession,
): AgentSendResult | AgentContinueResult => {
  const toolLog = [...session.toolLog]
  deleteSession(sessionId)
  return { ok: true, status: 'done', assistantText: '（已停止）', toolLog }
}

export const stopAgentTurn = (sessionId: string): { ok: true } | { ok: false; error: string } => {
  const sid = sessionId.trim()
  if (!sid) return { ok: false, error: 'sessionId 无效' }
  const session = getSession(sid)
  if (!session) return { ok: false, error: 'Agent 会话不存在或已结束' }
  session.abortRequested = true
  abortAgentRun(sid)
  return { ok: true }
}

export const runAgentLoopUntilDoneOrPending = async (
  sessionId: string,
  session: StoredAgentSession,
): Promise<AgentSendResult | AgentContinueResult> => {
  session.abortRequested = false
  bindAgentRunAbort(sessionId)
  try {
  while (true) {
    if (session.abortRequested) return finishAbortedAgent(sessionId, session)
    pushAgentCheckpoint(sessionId, session)
    session.turn += 1
    await prepareSessionBeforeModel(sessionId, session)
    emitAgentProgress({
      sessionId,
      turn: session.turn,
      kind: 'model',
      status: 'start',
    })
    const res = await runModelStep(session, sessionId)
    if (session.abortRequested) return finishAbortedAgent(sessionId, session)
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

      session.ctx.planMode = session.planMode

      const cfg = await getConfig()

      const runOneTool = async (tc: AgentToolCall) => {
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

        const perm = resolveToolPermission(cfg, tc.name as AgentToolName)
        if (perm === 'deny') {
          const denied: ToolRunResult = {
            kind: 'immediate',
            content: 'Error: Tool blocked by agent permission settings (disallowedTools or mode).',
            log: { name: tc.name as AgentToolName, summary: toolSummary, ok: false },
          }
          emitAgentProgress({
            sessionId,
            turn: session.turn,
            kind: 'tool',
            status: 'done',
            toolName: tc.name,
            summary: toolSummary,
            ok: false,
          })
          return { tc, run: denied }
        }

        if (cfg.agentHooksEnabled !== false) {
          const pre = await runHooks('PreToolUse', session.projectRoot, {
            toolName: tc.name as AgentToolName,
          })
          if (!pre.ok) {
            const blocked: ToolRunResult = {
              kind: 'immediate',
              content: `<user-prompt-submit-hook>Hook blocked tool: ${pre.message}</user-prompt-submit-hook>`,
              log: { name: tc.name as AgentToolName, summary: 'hook blocked', ok: false },
            }
            emitAgentProgress({
              sessionId,
              turn: session.turn,
              kind: 'tool',
              status: 'done',
              toolName: tc.name,
              summary: 'hook blocked',
              ok: false,
            })
            return { tc, run: blocked }
          }
        }

        let run = await executeAgentTool(session.ctx, tc)

        if (cfg.agentHooksEnabled !== false) {
          const post = await runHooks('PostToolUse', session.projectRoot, {
            toolName: tc.name as AgentToolName,
          })
          if (!post.ok) {
            run = {
              kind: 'immediate',
              content: `Hook blocked after tool: ${post.message}`,
              log: { name: tc.name as AgentToolName, summary: toolSummary, ok: false },
            }
          } else if (post.notes.length && run.kind === 'immediate') {
            run = {
              ...run,
              content: `${run.content}\n\n[hook]\n${post.notes.join('\n')}`,
            }
          }
        }

        if (
          (perm === 'allow' || cfg.agentAutoApplyWrites || session.ctx.workshopAutoApply) &&
          (run.kind === 'pending' || run.kind === 'bash_pending')
        ) {
          const applied = await applyPendingToolRun(session, run)
          if (applied.ok) {
            run = {
              kind: 'immediate',
              content: applied.content,
              log: {
                name: tc.name as AgentToolName,
                summary: toolSummary,
                ok: applied.logOk,
              },
            }
          } else {
            run = {
              kind: 'immediate',
              content: `Error: ${applied.error}`,
              log: { name: tc.name as AgentToolName, summary: toolSummary, ok: false },
            }
          }
        }

        emitAgentProgress({
          sessionId,
          turn: session.turn,
          kind: 'tool',
          status: 'done',
          toolName: run.log.name,
          summary: run.log.summary,
          ok: run.log.ok,
        })
        return { tc, run }
      }

      if (session.abortRequested) return finishAbortedAgent(sessionId, session)

      const toolOutcomes = await Promise.all(res.toolCalls.map(runOneTool))

      if (session.abortRequested) return finishAbortedAgent(sessionId, session)

      for (const { tc, run } of toolOutcomes) {
        session.toolLog.push(run.log)

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

      if (toolOutcomes.some((o) => o.tc.name === 'ToolSearch')) {
        refreshSessionActiveTools(session)
      }
      session.planMode = session.ctx.planMode ?? session.planMode

      if (pendingPublic.length || pendingBashPublic.length || pendingAskPublic.length) {
        const cfg = await getConfig()
        if (
          (cfg.agentAutoApplyWrites || session.ctx.workshopAutoApply) &&
          !pendingAskPublic.length
        ) {
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
  } finally {
    clearAgentRunAbort(sessionId)
  }
}

export const startAgentTurn = async (
  projectRoot: string,
  modelId: string,
  history: { role: 'user' | 'assistant'; content: string; reasoningContent?: string }[],
): Promise<AgentSendResult> => {
  if (!projectRoot.trim()) return { ok: false, error: '请先打开项目' }
  const model = await getModelById(modelId)
  if (!model) return { ok: false, error: '模型不存在' }
  const cfg = await getConfig()

  const sessionId = createSessionId()
  const revealedToolNames = new Set<import('./agent-types').AgentToolName>()
  const activeTools = getSessionActiveTools(buildFullAgentTools(), revealedToolNames)
  const scratchpadDir = await ensureScratchpadDir(sessionId)

  const lastUser = [...history].reverse().find((m) => m.role === 'user')?.content ?? ''
  if (cfg.agentHooksEnabled !== false && lastUser.trim()) {
    const hook = await runHooks('UserPromptSubmit', projectRoot, { userPrompt: lastUser })
    if (!hook.ok) {
      return { ok: false, error: `User prompt hook blocked: ${hook.message}` }
    }
  }

  const ctx: AgentContext = {
    projectRoot,
    readCache: new Set<string>(),
    modelId,
    sessionId,
    planMode: false,
    scratchpadDir,
  }

  await refreshCustomOutputStylesCache(projectRoot)

  const messages: AgentLoopMessage[] = [
    {
      role: 'system',
      content: await buildAgentSystemPrompt(projectRoot, {
        modelId: model.modelId,
        enabledToolNames: AGENT_TOOLS.map((t) => t.name),
        outputStyleId: cfg.agentOutputStyle,
        scratchpadDir,
        agentFrcKeepToolMessages: cfg.agentFrcKeepToolMessages ?? 8,
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
    planMode: false,
    revealedToolNames,
    activeTools,
    proactiveEnabled: cfg.agentProactiveEnabled ?? false,
    proactiveTick: 0,
    scratchpadDir,
    compactedOnce: false,
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

export const modelSupportsAgentTools = (model: ModelEntry | null | undefined) => !!model

export type WorkshopAgentTurnResult =
  | { ok: true; report: string; reasoningContent?: string }
  | { ok: true; report: string; needsUser: true; userQuestion: string; reasoningContent?: string }
  | { ok: false; error: string }

const collectWorkshopTurnReasoning = (session: StoredAgentSession): string => {
  const parts: string[] = []
  for (const m of session.messages) {
    if (m.role === 'assistant' && m.reasoningContent?.trim()) {
      parts.push(m.reasoningContent.trim())
    }
  }
  return parts.join('\n\n').trim()
}

/** Workshop 单角色：与 Chat Agent 同源循环（Read/Write/Grep…），sessionId 建议 `workshop-{id}-{role}` */
export type WorkshopAgentTurnOptions = {
  speakMode?: 'plan' | 'execute' | 'verify'
}

export const runWorkshopRoleAgentTurn = async (
  projectRoot: string,
  modelId: string,
  sessionId: string,
  taskPrompt: string,
  roleName: string,
  options?: WorkshopAgentTurnOptions,
): Promise<WorkshopAgentTurnResult> => {
  const root = projectRoot.trim()
  if (!root) return { ok: false, error: '请先打开项目' }
  const prompt = taskPrompt.trim()
  if (!prompt) return { ok: false, error: '任务内容为空' }
  const sid = sessionId.trim()
  if (!sid) return { ok: false, error: 'sessionId 无效' }

  const model = await getModelById(modelId)
  if (!model) return { ok: false, error: '模型不存在' }
  if (!modelSupportsAgentTools(model)) {
    return { ok: false, error: '当前模型不支持 Agent 工具，请使用 OpenAI 兼容模型' }
  }

  const cfg = await getConfig()
  const revealedToolNames = new Set<AgentToolName>()
  const activeTools = getSessionActiveTools(buildFullAgentTools(), revealedToolNames)
  const scratchpadDir = await ensureScratchpadDir(sid)

  const ctx: AgentContext = {
    projectRoot: root,
    readCache: new Set<string>(),
    modelId,
    sessionId: sid,
    planMode: false,
    scratchpadDir,
    workshopAutoApply: true,
  }

  await refreshCustomOutputStylesCache(root)

  const isPlan = options?.speakMode === 'plan'
  const isVerify = options?.speakMode === 'verify'
  const roleLead = isPlan
    ? [
        `【Collab Workshop · ${roleName}】`,
        '拆任务阶段：可用工具读代码，但最终一条 assistant 回复只能包含 ```json 步骤计划，禁止输出英文思考或过程描述。',
        '',
      ].join('\n')
    : isVerify
      ? [
          `【Collab Workshop · ${roleName}】`,
          '验收阶段：最终回复首行必须是 VERIFY: approve|redo|abort，其余用简短中文。',
          '',
        ].join('\n')
      : [
          `【Collab Workshop · ${roleName}】`,
          '执行本步任务：先用工具查看代码；最终回复只用简短中文结论（不要英文思考过程），可附文件路径。',
          '',
        ].join('\n')

  const messages: AgentLoopMessage[] = [
    {
      role: 'system',
      content: await buildAgentSystemPrompt(root, {
        modelId: model.modelId,
        enabledToolNames: AGENT_TOOLS.map((t) => t.name),
        outputStyleId: cfg.agentOutputStyle,
      }),
    },
    { role: 'user', content: `${roleLead}${prompt}` },
  ]

  const session: StoredAgentSession = {
    projectRoot: root,
    modelId,
    messages,
    ctx,
    toolLog: [],
    pendingById: new Map(),
    pendingBashById: new Map(),
    pendingAskById: new Map(),
    turn: 0,
    planMode: false,
    revealedToolNames,
    activeTools,
    proactiveEnabled: false,
    proactiveTick: 0,
    scratchpadDir,
    compactedOnce: false,
  }

  putSession(sid, session)
  const result = await runAgentLoopUntilDoneOrPending(sid, session)
  if (!result.ok) return { ok: false, error: result.error }

  const report = (result.assistantText || '').trim() || '（无结论）'
  const liveBeforeTeardown = getSession(sid)
  const reasoningContent = liveBeforeTeardown
    ? collectWorkshopTurnReasoning(liveBeforeTeardown)
    : ''
  const reasoningMeta = reasoningContent ? { reasoningContent } : {}

  if (result.status === 'done') {
    deleteSession(sid)
    return { ok: true, report, ...reasoningMeta }
  }

  const asks = result.pendingAsks ?? []
  if (asks.length) {
    deleteSession(sid)
    const q =
      asks
        .flatMap((a) => a.questions.map((qq) => qq.prompt))
        .filter(Boolean)
        .join('；') || '请补充需求细节？'
    return { ok: true, report, needsUser: true, userQuestion: q.slice(0, 300), ...reasoningMeta }
  }

  const live = getSession(sid)
  if (live && (live.pendingById.size || live.pendingBashById.size)) {
    const applied = await applyAllPendingInSession(live)
    deleteSession(sid)
    if (!applied.ok) return { ok: false, error: applied.error }
    return {
      ok: true,
      report: `${report}\n\n（已自动应用文件/命令变更）`.trim(),
      ...reasoningMeta,
    }
  }

  deleteSession(sid)
  return { ok: true, report, ...reasoningMeta }
}

export { listAgentSessions, rewindAgentCheckpoint }
export {
  listAgentCheckpoints,
  clearAgentCheckpoints,
} from './agent-checkpoint'
