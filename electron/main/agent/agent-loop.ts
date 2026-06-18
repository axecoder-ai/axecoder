import { providerSupportsSseStream, type ModelEntry } from '../models-types'
import { getModelById } from '../models-store'
import { getSecret } from '../secrets-store'
import { chatWithToolsForModel } from '../ai/chat-with-tools'
import { checkVisionBeforeChat } from '../ai/ai-vision-guard'
import { resolveApiModelIdForTask } from '../ai/api-model-resolve'
import { t } from '../i18n'
import { normalizeReasoningEffort } from '../../../shared/reasoning-effort'
import { AGENT_TOOLS, buildAgentSystemPrompt, buildFullAgentTools } from './agent-tool-defs'
import { getSessionActiveTools } from './agent-ext-executor'
import type { AgentToolCall, AgentToolDef } from './agent-types'
import type {
  AgentContinueResult,
  AgentLoopMessage,
  AgentSendResult,
  AgentToolLogEntry,
  PendingAskUserPublic,
  PendingBashPublic,
  PendingPlanPublic,
  PendingWritePublic,
} from './agent-types'
import { composePlanBuildUserMessage, userWantsCreatePlan } from './agent-create-plan'
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
  pendingPlanToPublic,
  pendingToPublic,
  putSession,
  type StoredAgentSession,
} from './agent-session-store'
import { executeAgentTool, type AgentContext, type ToolRunResult } from './tool-executor'
import { emitAgentProgress } from './agent-progress-emit'
import { formatModelCallDetail, formatToolResultDetail } from './agent-progress-detail'
import { traceToolCall, traceToolResult } from '../ai-trace-store'
import { formatAutoPlanNotice, resolveShouldAutoPlan } from './agent-auto-plan'
import { getConfig } from '../config-store'
import { buildMergedPermissionsPolicy, resolveToolPermission } from './agent-permissions'
import { extractToolSubject } from './agent-permission-rules'
import { isReadOnlyBashCommand } from './agent-bash-readonly'
import { extractPullRequestFromOutput } from '../git-forge/git-operation-tracking'
import { buildGitForgeContext } from '../git-forge/detect-forge'
import { runHooks } from './agent-hooks'
import { clearOldToolResults, dropOrphanToolMessages } from './agent-frc'
import { compactAgentMessages, compactAgentMessagesWithLlm, shouldAutoCompact } from './agent-context-compact'
import { getTokenBudgetSection } from './agent-token-budget'
import { maybeInjectProactiveReminder } from './agent-proactive'
import { ensureScratchpadDir } from './agent-scratchpad'
import { buildAgentContextInjections } from './agent-context-inject'
import {
  applyStormBreaker,
  checkRepeatBeforeExecute,
  createLoopGuardState,
  exceededToolRoundLimit,
  recordRepeatSuccess,
  resolveLoopGuardConfig,
  type GuardToolOutcome,
} from './agent-loop-guard'
import {
  abortAgentRun,
  bindAgentRunAbort,
  clearAgentRunAbort,
  getAgentRunAbortSignal,
} from './agent-run-abort'
import { interruptBackgroundRun, listBackgroundRuns } from './agent-subagent-tasks'
import { stopShellTasksForSession } from './agent-bash-tasks'
import { refreshCustomOutputStylesCache } from './agent-output-styles-custom'
import type { AgentToolName } from './agent-types'
import {
  applyChatModeToNewSession,
  applySwitchModeToSession,
  chatModeSystemAddon,
  normalizeChatMode,
  shouldTriggerAutoPlanOnTurn,
  type ChatModeId,
} from './chat-mode'
import { applyRppitModeToLastUserMessage } from './rppit-command'
import { applyAgentRolePersonaToMessages } from './agent-role-persona'

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
  if (!model) return { ok: false as const, error: t('errors.modelNotFound') }
  const apiKey = await getSecret(session.modelId)
  const apiModelId = await resolveApiModelIdForTask(
    model,
    'main',
    lastUserTextFromMessages(session.messages),
  )
  const workshopStream = sessionId.startsWith('workshop-')
  const onDelta = providerSupportsSseStream(model.provider)
      ? (delta: { content?: string; reasoning?: string }) => {
          if (workshopStream) {
            if (delta.content) {
              emitAgentProgress({ sessionId, kind: 'content_delta', delta: delta.content })
            }
            if (delta.reasoning) {
              emitAgentProgress({ sessionId, kind: 'thinking_delta', delta: delta.reasoning })
            }
          } else {
            // Agent 模式：分离 content 和 reasoning（thinking）
            if (delta.content) {
              emitAgentProgress({ sessionId, kind: 'content_delta', delta: delta.content })
            }
            if (delta.reasoning) {
              emitAgentProgress({ sessionId, kind: 'thinking_delta', delta: delta.reasoning })
            }
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
    sessionId.startsWith('workshop-') ? 'workshop' : 'agent',
    { sessionId, turn: session.turn },
    session.reasoningEffort,
  )
}

const refreshSessionActiveTools = (session: StoredAgentSession) => {
  session.activeTools = getSessionActiveTools(buildFullAgentTools(), session.revealedToolNames)
}

const backgroundTaskIdsFromSession = (session: StoredAgentSession) => {
  const ids = session.ctx.backgroundTaskIds ?? []
  return ids.length ? [...ids] : undefined
}

const replyMeta = (
  session: StoredAgentSession,
  content?: string,
  reasoningContent?: string,
) => {
  const speakerUserId = session.assigneeUserId
  const backgroundTaskIds = backgroundTaskIdsFromSession(session)
  return {
    ...(content !== undefined ? { assistantContent: content } : {}),
    ...(reasoningContent ? { reasoningContent } : {}),
    ...(speakerUserId ? { speakerUserId } : {}),
    ...(backgroundTaskIds ? { backgroundTaskIds } : {}),
  }
}

const finishDone = (
  session: StoredAgentSession,
  assistantText: string,
  sessionId?: string,
  content?: string,
  reasoningContent?: string,
): AgentSendResult | AgentContinueResult => {
  const toolLog = [...session.toolLog]
  if (sessionId) deleteSession(sessionId)
  return {
    ok: true,
    status: 'done',
    assistantText,
    toolLog,
    ...replyMeta(session, content, reasoningContent),
  }
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
  pendingPlans: PendingPlanPublic[],
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
  ...(pendingPlans.length ? { pendingPlans } : {}),
  assistantText,
  toolLog: [...session.toolLog],
  ...replyMeta(session, content, reasoningContent),
})

const collectPendingPublic = (session: StoredAgentSession) => ({
  writes: [...session.pendingById.values()].map(pendingToPublic),
  bashes: [...session.pendingBashById.values()].map(pendingBashToPublic),
  asks: [...session.pendingAskById.values()].map(pendingAskToPublic),
  plans: [...session.pendingPlanById.values()].map(pendingPlanToPublic),
})

const hasPendingInSession = (session: StoredAgentSession) =>
  session.pendingById.size > 0 ||
  session.pendingBashById.size > 0 ||
  session.pendingAskById.size > 0 ||
  session.pendingPlanById.size > 0

const stripBudgetReminders = (messages: AgentLoopMessage[]) =>
  messages.filter(
    (m) => !(m.role === 'user' && (m.content ?? '').includes('Context budget:')),
  )

const stripContextInjectReminders = (messages: AgentLoopMessage[]) =>
  messages.filter(
    (m) =>
      !(m.role === 'user' && (m.content ?? '').includes('<agent-context-injection>')),
  )

const prepareSessionBeforeModel = async (sessionId: string, session: StoredAgentSession) => {
  const cfg = await getConfig()
  clearOldToolResults(session.messages, cfg.agentFrcKeepToolMessages ?? 8)
  const threshold = cfg.agentContextCompactThreshold ?? 120_000
  if (shouldAutoCompact(session.messages, threshold)) {
    const compacted = await compactAgentMessagesWithLlm(session.messages, 24, {
      modelId: session.modelId,
      sessionId,
    })
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
  const backgroundTaskIds = backgroundTaskIdsFromSession(session)
  deleteSession(sessionId)
  return {
    ok: true,
    status: 'done',
    assistantText: t('common.stopped'),
    toolLog,
    ...(backgroundTaskIds ? { backgroundTaskIds } : {}),
  }
}

export const stopAgentTurn = (sessionId: string): { ok: true } | { ok: false; error: string } => {
  const sid = sessionId.trim()
  if (!sid) return { ok: false, error: t('errors.invalidSessionIdShort') }
  const session = getSession(sid)
  if (!session) return { ok: false, error: t('errors.agentSessionMissing') }
  session.abortRequested = true
  abortAgentRun(sid)
  for (const run of listBackgroundRuns(sid)) {
    if (run.status === 'running') interruptBackgroundRun(run.id)
  }
  stopShellTasksForSession(sid)
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
      detail: formatModelCallDetail(res),
    })

    const assistantText = res.text.trim()
    if (res.toolCalls.length) {
      if (!session.loopGuard) session.loopGuard = createLoopGuardState()
      const cfg = await getConfig()
      const guardCfg = resolveLoopGuardConfig(cfg)
      session.loopGuard.toolRounds += 1
      if (exceededToolRoundLimit(session.loopGuard, guardCfg)) {
        session.messages.push({
          role: 'assistant',
          content: res.content ?? '',
          reasoningContent: res.reasoningContent,
          toolCalls: res.toolCalls,
        })
        return {
          ok: true,
          status: 'done',
          assistantText: t('agent.loopGuardMaxRounds', {
            n: String(guardCfg.maxToolRounds),
          }),
          toolLog: [...session.toolLog],
        }
      }

      session.messages.push({
        role: 'assistant',
        content: res.content ?? '',
        reasoningContent: res.reasoningContent,
        toolCalls: res.toolCalls,
      })

      const pendingPublic: PendingWritePublic[] = []
      const pendingBashPublic: PendingBashPublic[] = []
      const pendingAskPublic: PendingAskUserPublic[] = []
      const pendingPlanPublic: PendingPlanPublic[] = []

      session.ctx.planMode = session.planMode

      const mergedPermPolicy = await buildMergedPermissionsPolicy(cfg, session.projectRoot)

      const runOneTool = async (tc: AgentToolCall) => {
        const toolSummary =
          strArg(tc.arguments, 'file_path') ||
          strArg(tc.arguments, 'pattern') ||
          strArg(tc.arguments, 'command') ||
          tc.name
        const emitToolDoneProgress = (
          toolName: string,
          summary: string,
          ok: boolean,
          content: string,
        ) => {
          emitAgentProgress({
            sessionId,
            turn: session.turn,
            kind: 'tool',
            status: 'done',
            toolName,
            summary,
            ok,
            detail: formatToolResultDetail(content),
          })
        }
        emitAgentProgress({
          sessionId,
          turn: session.turn,
          kind: 'tool',
          status: 'start',
          toolName: tc.name,
          summary: toolSummary,
        })
        traceToolCall({
          sessionId,
          turn: session.turn,
          toolName: tc.name,
          args: tc.arguments,
        })

        const bashCommand = tc.name === 'Bash' ? strArg(tc.arguments as Record<string, unknown>, 'command') : ''
        const bashReadOnly = bashCommand ? isReadOnlyBashCommand(bashCommand) : false

        const subject = extractToolSubject(tc.arguments as Record<string, unknown>)
        const perm = resolveToolPermission(cfg, tc.name as AgentToolName, {
          subject,
          mergedPolicy: mergedPermPolicy,
        })
        const effectivePerm = bashReadOnly && perm === 'ask' ? 'allow' : perm
        if (perm === 'deny') {
          const denied: ToolRunResult = {
            kind: 'immediate',
            content: 'Error: Tool blocked by agent permission settings (disallowedTools or mode).',
            log: { name: tc.name as AgentToolName, summary: toolSummary, ok: false },
          }
          emitToolDoneProgress(tc.name, toolSummary, false, denied.content)
          traceToolResult({
            sessionId,
            turn: session.turn,
            toolName: tc.name,
            ok: false,
            content: denied.content,
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
            emitToolDoneProgress(tc.name, 'hook blocked', false, blocked.content)
            traceToolResult({
              sessionId,
              turn: session.turn,
              toolName: tc.name,
              ok: false,
              content: blocked.content,
            })
            return { tc, run: blocked }
          }
        }

        const repeatBlock = checkRepeatBeforeExecute(
          session.loopGuard,
          guardCfg,
          tc.name,
          tc.arguments as Record<string, unknown>,
        )
        if (repeatBlock) {
          emitAgentProgress({
            sessionId,
            kind: 'loop_guard',
            text: `loop guard: blocked repeated ${tc.name}`,
          })
          const blocked: ToolRunResult = {
            kind: 'immediate',
            content: repeatBlock,
            log: { name: tc.name as AgentToolName, summary: toolSummary, ok: false },
          }
          emitToolDoneProgress(tc.name, toolSummary, false, repeatBlock)
          traceToolResult({
            sessionId,
            turn: session.turn,
            toolName: tc.name,
            ok: false,
            content: repeatBlock,
          })
          return { tc, run: blocked }
        }

        if (session.abortRequested) {
          const aborted: ToolRunResult = {
            kind: 'immediate',
            content: 'Error: Agent run stopped by user.',
            log: { name: tc.name as AgentToolName, summary: toolSummary, ok: false },
          }
          emitToolDoneProgress(tc.name, toolSummary, false, aborted.content)
          traceToolResult({
            sessionId,
            turn: session.turn,
            toolName: tc.name,
            ok: false,
            content: aborted.content,
          })
          return { tc, run: aborted }
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
          (effectivePerm === 'allow' || cfg.agentAutoApplyWrites || session.ctx.workshopAutoApply) &&
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

        const toolResultContent =
          run.kind === 'immediate'
            ? run.content
            : run.kind === 'pending' || run.kind === 'bash_pending'
              ? 'Pending user approval for this change.'
              : 'Pending user answers to structured questions.'
        emitToolDoneProgress(run.log.name, run.log.summary, run.log.ok, toolResultContent)

        if (
          tc.name === 'Bash' &&
          run.kind === 'immediate' &&
          run.log.ok &&
          bashCommand
        ) {
          const forgeCtx = await buildGitForgeContext(session.projectRoot, cfg)
          const pr = extractPullRequestFromOutput(
            bashCommand,
            run.content,
            forgeCtx.kind === 'gitee' ? 'gitee' : 'github',
          )
          if (pr?.url) session.linkedPrUrl = pr.url
        }

        if (run.kind === 'immediate' && run.log.ok) {
          recordRepeatSuccess(
            session.loopGuard,
            tc.name,
            tc.arguments as Record<string, unknown>,
            true,
          )
        }

        traceToolResult({
          sessionId,
          turn: session.turn,
          toolName: tc.name,
          ok: run.log.ok,
          content: run.kind === 'immediate' ? run.content : run.kind,
        })
        return { tc, run }
      }

      if (session.abortRequested) return finishAbortedAgent(sessionId, session)

      const toolOutcomes = await Promise.all(res.toolCalls.map(runOneTool))

      if (session.abortRequested) return finishAbortedAgent(sessionId, session)

      const guardOutcomes: GuardToolOutcome[] = toolOutcomes.map(({ tc, run }) => ({
        toolName: tc.name,
        args: tc.arguments as Record<string, unknown>,
        content:
          run.kind === 'immediate'
            ? run.content
            : run.kind === 'pending' || run.kind === 'bash_pending'
              ? 'Pending user approval for this change.'
              : 'Pending user answers to structured questions.',
        ok: run.log.ok,
      }))
      const storm = applyStormBreaker(
        session.loopGuard,
        guardCfg,
        res.toolCalls,
        guardOutcomes,
      )
      if (storm.notice) {
        emitAgentProgress({ sessionId, kind: 'loop_guard', text: storm.notice })
      }

      for (let i = 0; i < toolOutcomes.length; i++) {
        const { tc, run } = toolOutcomes[i]!
        const guardedContent = storm.contents[i]
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
        } else if (run.kind === 'plan_pending') {
          session.pendingPlanById.set(run.pendingPlan.id, run.pendingPlan)
          pendingPlanPublic.push(pendingPlanToPublic(run.pendingPlan))
          session.messages.push({
            role: 'tool',
            toolCallId: tc.id,
            name: tc.name,
            content: `Plan saved to ${run.pendingPlan.filePath}. Awaiting user Build or Dismiss.`,
          })
        } else {
          session.messages.push({
            role: 'tool',
            toolCallId: tc.id,
            name: tc.name,
            content: guardedContent ?? run.content,
          })
        }
      }

      if (toolOutcomes.some((o) => o.tc.name === 'ToolSearch')) {
        refreshSessionActiveTools(session)
      }
      session.planMode = session.ctx.planMode ?? session.planMode

      if (
        pendingPublic.length ||
        pendingBashPublic.length ||
        pendingAskPublic.length ||
        pendingPlanPublic.length
      ) {
        const cfg = await getConfig()
        if (
          (cfg.agentAutoApplyWrites || session.ctx.workshopAutoApply) &&
          !pendingAskPublic.length &&
          !pendingPlanPublic.length
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
          pendingPlanPublic,
          assistantText,
          res.content,
          res.reasoningContent,
        )
      }
      continue
    }

    return finishDone(
      session,
      assistantText || '(model returned no content)',
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
  history: {
    role: 'user' | 'assistant'
    content: string
    reasoningContent?: string
    images?: import('../models-types').AiChatImagePart[]
  }[],
  chatModeRaw?: ChatModeId | string,
  assigneeUserId?: string,
  roleWorkflowInvoke?: boolean,
  reasoningEffortRaw?: string,
): Promise<AgentSendResult> => {
  const chatMode = normalizeChatMode(chatModeRaw)
  if (!projectRoot.trim()) return { ok: false, error: t('errors.noProject') }
  const model = await getModelById(modelId)
  if (!model) return { ok: false, error: t('errors.modelNotFound') }
  const visionBlocked = checkVisionBeforeChat(
    model,
    history.map((m) => ({
      role: m.role,
      content: m.content,
      ...(m.images?.length ? { images: m.images } : {}),
    })),
  )
  if (visionBlocked) return visionBlocked
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
    ...(roleWorkflowInvoke ? { workshopAutoApply: true } : {}),
  }

  await refreshCustomOutputStylesCache(projectRoot)

  const systemBase = await buildAgentSystemPrompt(projectRoot, {
    modelId: model.modelId,
    enabledToolNames: AGENT_TOOLS.map((t) => t.name),
    outputStyleId: cfg.agentOutputStyle,
    scratchpadDir,
    agentFrcKeepToolMessages: cfg.agentFrcKeepToolMessages ?? 8,
  })
  const messages: AgentLoopMessage[] = [
    {
      role: 'system',
      content: systemBase + chatModeSystemAddon(chatMode),
    },
  ]
  for (const m of history) {
    if (m.role === 'user') {
      messages.push({
        role: 'user',
        content: m.content ?? '',
        ...(m.images?.length ? { images: m.images } : {}),
      })
    } else if (m.role === 'assistant') {
      messages.push({
        role: 'assistant',
        content: m.content ?? '',
        ...(m.reasoningContent ? { reasoningContent: m.reasoningContent } : {}),
      })
    }
  }

  if (chatMode === 'rppit') {
    const rppitApplied = await applyRppitModeToLastUserMessage(messages)
    if (!rppitApplied.ok) {
      messages[0]!.content +=
        `\n\n<chat-mode>rppit mode active but playbook missing: ${rppitApplied.error}</chat-mode>`
    }
  }

  const resolvedAssignee = await applyAgentRolePersonaToMessages(
    projectRoot,
    assigneeUserId,
    messages,
    roleWorkflowInvoke,
  )

  if (roleWorkflowInvoke && !resolvedAssignee && messages[0]?.role === 'system') {
    messages[0] = {
      ...messages[0],
      content: `${messages[0].content}\n\n[Workflow slash command]\nThe latest user message IS the workflow playbook. Execute it step by step immediately. Use Write (or Edit) to save deliverables to disk under the paths the playbook specifies—do not only paste the report in chat.`,
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
    pendingPlanById: new Map(),
    turn: 0,
    planMode: false,
    chatMode: 'agent',
    revealedToolNames,
    activeTools,
    proactiveEnabled: cfg.agentProactiveEnabled ?? false,
    proactiveTick: 0,
    scratchpadDir,
    compactedOnce: false,
    loopGuard: createLoopGuardState(),
    reasoningEffort: normalizeReasoningEffort(reasoningEffortRaw),
    ...(resolvedAssignee ? { assigneeUserId: resolvedAssignee } : {}),
  }
  applyChatModeToNewSession(session, chatMode)

  if (userWantsCreatePlan(lastUser)) {
    session.planMode = true
    session.ctx.planMode = true
    const sys = messages.find((m) => m.role === 'system')
    if (sys && sys.role === 'system') {
      sys.content = `${sys.content}\n\n[create_plan]\nThe user asked to use CreatePlan. You MUST call the CreatePlan tool with name, overview, and plan (markdown body). Do not only reply with plan text in chat—the tool writes docs/plans/plan-<slug>.md and shows a Build button.`
    }
  }

  const bypass = cfg.agentPermissionMode === 'bypassPermissions'
  if (
    shouldTriggerAutoPlanOnTurn(chatMode, cfg.agentAutoPlan, {
      planMode: session.planMode,
      bypass,
      hasUserMessage: !!lastUser.trim(),
    })
  ) {
    const autoPlan = await resolveShouldAutoPlan(lastUser, {
      chatModelId: modelId,
      classifierModelId: cfg.agentAutoPlanClassifierModelId,
      classifierEnabled: true,
    })
    if (autoPlan.shouldPlan) {
      session.planMode = true
      session.ctx.planMode = true
      emitAgentProgress({
        sessionId,
        kind: 'loop_guard',
        text: formatAutoPlanNotice(autoPlan),
      })
    }
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
  if (!session) return { ok: false, error: t('errors.sessionExpired') }
  const pending = session.pendingById.get(pendingId)
  if (!pending) return { ok: false, error: t('errors.pendingChangeMissing') }

  const applied = await pending.apply()
  session.pendingById.delete(pendingId)
  if (!applied.ok) return { ok: false, error: applied.error }

  const toolMsg = session.messages.find(
    (m) => m.role === 'tool' && m.toolCallId === pending.toolCallId,
  )
  if (toolMsg && toolMsg.role === 'tool') {
    toolMsg.content = `Applied: ${pending.summary}`
  }

  const { writes, bashes, asks, plans } = collectPendingPublic(session)
  if (writes.length || bashes.length || asks.length || plans.length) {
    return finishPending(sessionId, session, writes, bashes, asks, plans, '')
  }

  return runAgentLoopUntilDoneOrPending(sessionId, session)
}

export const confirmAgentBash = async (
  sessionId: string,
  pendingId: string,
): Promise<AgentContinueResult> => {
  const session = getSession(sessionId)
  if (!session) return { ok: false, error: t('errors.sessionExpired') }
  const pending = session.pendingBashById.get(pendingId)
  if (!pending) return { ok: false, error: t('errors.pendingCommandMissing') }

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

  const { writes, bashes, asks, plans } = collectPendingPublic(session)
  if (writes.length || bashes.length || asks.length || plans.length) {
    return finishPending(sessionId, session, writes, bashes, asks, plans, '')
  }

  return runAgentLoopUntilDoneOrPending(sessionId, session)
}

export const rejectAgentWrite = async (
  sessionId: string,
  pendingId: string,
  reason?: string,
): Promise<AgentContinueResult> => {
  const session = getSession(sessionId)
  if (!session) return { ok: false, error: t('errors.sessionExpired') }
  const pending = session.pendingById.get(pendingId)
  if (!pending) return { ok: false, error: t('errors.pendingChangeMissing') }

  session.pendingById.delete(pendingId)
  const toolMsg = session.messages.find(
    (m) => m.role === 'tool' && m.toolCallId === pending.toolCallId,
  )
  if (toolMsg && toolMsg.role === 'tool') {
    toolMsg.content = `Rejected by user: ${reason?.trim() || 'User rejected'}`
  }

  const { writes, bashes, asks, plans } = collectPendingPublic(session)
  if (writes.length || bashes.length || asks.length || plans.length) {
    return finishPending(sessionId, session, writes, bashes, asks, plans, '')
  }

  return runAgentLoopUntilDoneOrPending(sessionId, session)
}

export const rejectAgentBash = async (
  sessionId: string,
  pendingId: string,
  reason?: string,
): Promise<AgentContinueResult> => {
  const session = getSession(sessionId)
  if (!session) return { ok: false, error: t('errors.sessionExpired') }
  const pending = session.pendingBashById.get(pendingId)
  if (!pending) return { ok: false, error: t('errors.pendingCommandMissing') }

  session.pendingBashById.delete(pendingId)
  const toolMsg = session.messages.find(
    (m) => m.role === 'tool' && m.toolCallId === pending.toolCallId,
  )
  if (toolMsg && toolMsg.role === 'tool') {
    toolMsg.content = `Rejected by user: ${reason?.trim() || 'User rejected'}`
  }

  const { writes, bashes, asks, plans } = collectPendingPublic(session)
  if (writes.length || bashes.length || asks.length || plans.length) {
    return finishPending(sessionId, session, writes, bashes, asks, plans, '')
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
  if (!session) return { ok: false, error: t('errors.sessionExpired') }
  const pending = session.pendingAskById.get(pendingId)
  if (!pending) return { ok: false, error: t('errors.pendingQuestionMissing') }

  const valid = validateAskAnswers(pending.questions, answers)
  if (!valid.ok) return { ok: false, error: valid.error }

  session.pendingAskById.delete(pendingId)
  const toolMsg = session.messages.find(
    (m) => m.role === 'tool' && m.toolCallId === pending.toolCallId,
  )
  if (toolMsg && toolMsg.role === 'tool') {
    toolMsg.content = JSON.stringify({ answers })
  }

  const { writes, bashes, asks, plans } = collectPendingPublic(session)
  if (writes.length || bashes.length || asks.length || plans.length) {
    return finishPending(sessionId, session, writes, bashes, asks, plans, '')
  }

  return runAgentLoopUntilDoneOrPending(sessionId, session)
}

const injectPlanBuildAndContinue = async (
  sessionId: string,
  session: StoredAgentSession,
  planRelPath: string,
  toolCallId?: string,
  pendingId?: string,
): Promise<AgentContinueResult> => {
  if (pendingId) session.pendingPlanById.delete(pendingId)
  if (toolCallId) {
    const toolMsg = session.messages.find(
      (m) => m.role === 'tool' && m.toolCallId === toolCallId,
    )
    if (toolMsg && toolMsg.role === 'tool') {
      toolMsg.content = `User accepted plan. Building from ${planRelPath}.`
    }
  }
  session.planMode = false
  session.ctx.planMode = false
  applySwitchModeToSession(session, 'agent')
  if (session.ctx.sessionId) {
    emitAgentProgress({
      sessionId: session.ctx.sessionId,
      kind: 'chat_mode',
      chatMode: 'agent',
      planMode: false,
    })
  }
  const composed = await composePlanBuildUserMessage(session.projectRoot, planRelPath)
  if (!composed.ok) return { ok: false, error: composed.error }
  session.messages.push({ role: 'user', content: composed.text })
  return runAgentLoopUntilDoneOrPending(sessionId, session)
}

export const buildAgentPlan = async (
  sessionId: string,
  pendingId: string,
): Promise<AgentContinueResult> => {
  const session = getSession(sessionId)
  if (!session) return { ok: false, error: t('errors.sessionExpired') }
  const pending = session.pendingPlanById.get(pendingId)
  if (!pending) return { ok: false, error: 'Pending plan not found' }
  return injectPlanBuildAndContinue(
    sessionId,
    session,
    pending.filePath,
    pending.toolCallId,
    pendingId,
  )
}

export const dismissAgentPlan = async (
  sessionId: string,
  pendingId: string,
): Promise<AgentContinueResult> => {
  const session = getSession(sessionId)
  if (!session) return { ok: false, error: t('errors.sessionExpired') }
  const pending = session.pendingPlanById.get(pendingId)
  if (!pending) return { ok: false, error: 'Pending plan not found' }

  session.pendingPlanById.delete(pendingId)
  const toolMsg = session.messages.find(
    (m) => m.role === 'tool' && m.toolCallId === pending.toolCallId,
  )
  if (toolMsg && toolMsg.role === 'tool') {
    toolMsg.content = 'User dismissed the plan.'
  }

  const { writes, bashes, asks, plans } = collectPendingPublic(session)
  if (writes.length || bashes.length || asks.length || plans.length) {
    return finishPending(sessionId, session, writes, bashes, asks, plans, '')
  }

  return runAgentLoopUntilDoneOrPending(sessionId, session)
}

export const composePlanBuildMessage = async (
  projectRoot: string,
  planRelPath: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> =>
  composePlanBuildUserMessage(projectRoot, planRelPath)

export const modelSupportsAgentTools = (model: ModelEntry | null | undefined) => !!model

export type WorkshopAgentTurnResult =
  | { ok: true; report: string; reasoningContent?: string }
  | {
      ok: true
      report: string
      needsUser: true
      userQuestion: string
      pendingAsks?: PendingAskUserPublic[]
      reasoningContent?: string
    }
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
  speakMode?: 'plan' | 'execute' | 'verify' | 'member' | 'manager_chat'
  userImages?: import('../models-types').AiChatImagePart[]
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
  if (!root) return { ok: false, error: t('errors.noProject') }
  const prompt = taskPrompt.trim()
  if (!prompt) return { ok: false, error: t('errors.emptyTask') }
  const sid = sessionId.trim()
  if (!sid) return { ok: false, error: t('errors.invalidSessionIdShort') }

  const model = await getModelById(modelId)
  if (!model) return { ok: false, error: t('errors.modelNotFound') }
  if (!modelSupportsAgentTools(model)) {
    return { ok: false, error: t('errors.agentToolsUnsupported') }
  }
  const cfg = await getConfig()
  const revealedToolNames = new Set<AgentToolName>()
  const allTools = buildFullAgentTools()
  const activeTools = getSessionActiveTools(allTools, revealedToolNames)
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
        `[Collab Workshop · ${roleName} · plan]`,
        'Use the same tools as Chat Agent mode. Final assistant message must be only a ```json step plan—no reasoning prose.',
        '',
      ].join('\n')
    : isVerify
      ? [
          `[Collab Workshop · ${roleName} · verify]`,
          'Use the same tools as Chat Agent mode. First line must be VERIFY: approve|redo|abort.',
          '',
        ].join('\n')
      : [`[Collab Workshop · ${roleName}]`, 'Same tool capabilities as Chat Agent mode.', ''].join('\n')

  const messages: AgentLoopMessage[] = [
    {
      role: 'system',
      content:
        (await buildAgentSystemPrompt(root, {
          modelId: model.modelId,
          enabledToolNames: activeTools.map((t) => t.name),
          outputStyleId: cfg.agentOutputStyle,
          scratchpadDir,
          agentFrcKeepToolMessages: cfg.agentFrcKeepToolMessages ?? 8,
        })) + chatModeSystemAddon('agent'),
    },
    {
      role: 'user',
      content: `${roleLead}${prompt}`,
      ...(options?.userImages?.length ? { images: options.userImages } : {}),
    },
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
    pendingPlanById: new Map(),
    turn: 0,
    planMode: false,
    chatMode: 'agent',
    revealedToolNames,
    activeTools,
    proactiveEnabled: false,
    proactiveTick: 0,
    scratchpadDir,
    compactedOnce: false,
    loopGuard: createLoopGuardState(),
  }
  applyChatModeToNewSession(session, 'agent')

  putSession(sid, session)
  const result = await runAgentLoopUntilDoneOrPending(sid, session)
  if (!result.ok) return { ok: false, error: result.error }

  const report = (result.assistantText || '').trim() || '(no conclusion)'
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
        .join('；') || 'Please add requirement details?'
    return {
      ok: true,
      report,
      needsUser: true,
      userQuestion: q.slice(0, 300),
      pendingAsks: asks.map((a) => ({ id: a.id, questions: a.questions })),
      ...reasoningMeta,
    }
  }

  const live = getSession(sid)
  if (live && (live.pendingById.size || live.pendingBashById.size)) {
    const applied = await applyAllPendingInSession(live)
    deleteSession(sid)
    if (!applied.ok) return { ok: false, error: applied.error }
    return {
      ok: true,
      report: `${report}\n\n(file/command changes auto-applied)`.trim(),
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
