import {
  agent as createAgent,
  methods,
  PROTOCOL_VERSION,
  type AgentApp,
  type AgentContext,
  type PromptRequest,
  type RequestPermissionResponse,
} from '@agentclientprotocol/sdk'
import { randomBytes } from 'node:crypto'
import type {
  AgentContinueResult,
  AgentSendResult,
  PendingAskUserPublic,
  PendingBashPublic,
  PendingPlanPublic,
  PendingSmartApprovalPublic,
  PendingWritePublic,
} from '../agent/agent-types'
import type { AgentProgressPayload } from '../../../src/utils/agent-progress'
import { listModels } from '../models-store'
import { getAcpStandaloneBridge } from './acp-standalone-bridge'
import {
  agentToolToAcpKind,
  buildPermissionOptions,
  extractPromptText,
  mapToolStatus,
  nextToolCallId,
} from './acp-tool-mapper'
import { createAcpSession, getAcpSession } from './acp-session-store'

const newAcpSessionId = () =>
  Array.from(randomBytes(16))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')

export const resolveActiveModelId = async (): Promise<string | null> => {
  const data = await listModels()
  const active = data.activeModelId?.trim()
  if (active && data.models.some((m) => m.id === active && m.enabled !== false)) return active
  return data.models.find((m) => m.enabled !== false)?.id ?? null
}

type AgentLoopResult = AgentSendResult | AgentContinueResult

const isPending = (
  r: AgentLoopResult,
): r is Extract<AgentLoopResult, { ok: true; status: 'pending' }> =>
  r.ok === true && r.status === 'pending'

const permissionAllowed = (res: RequestPermissionResponse): boolean => {
  const outcome = res.outcome
  if (!outcome || outcome.outcome === 'cancelled') return false
  if (outcome.outcome === 'selected') {
    return outcome.optionId === 'allow_once' || outcome.optionId === 'allow'
  }
  return false
}

const emitProgressAsAcp = async (
  cx: AgentContext,
  acpSessionId: string,
  payload: AgentProgressPayload,
) => {
  if (payload.kind === 'content_delta' && payload.delta) {
    await cx.notify(methods.client.session.update, {
      sessionId: acpSessionId,
      update: {
        sessionUpdate: 'agent_message_chunk',
        content: { type: 'text', text: payload.delta },
      },
    })
  }
  if (payload.kind === 'tool' && payload.toolName) {
    const toolCallId = nextToolCallId()
    if (payload.status === 'start') {
      await cx.notify(methods.client.session.update, {
        sessionId: acpSessionId,
        update: {
          sessionUpdate: 'tool_call',
          toolCallId,
          title: payload.summary || payload.toolName,
          kind: agentToolToAcpKind(payload.toolName),
          status: mapToolStatus('start'),
          rawInput: { tool: payload.toolName, summary: payload.summary },
        },
      })
    } else if (payload.status === 'done') {
      await cx.notify(methods.client.session.update, {
        sessionId: acpSessionId,
        update: {
          sessionUpdate: 'tool_call_update',
          toolCallId,
          status: mapToolStatus('done', payload.ok !== false),
          content: payload.detail
            ? [{ type: 'content', content: { type: 'text', text: payload.detail } }]
            : undefined,
        },
      })
    }
  }
}

const requestAndApplyPermission = async (
  cx: AgentContext,
  acpSessionId: string,
  title: string,
  kind: ReturnType<typeof agentToolToAcpKind>,
  rawInput: Record<string, unknown>,
): Promise<boolean> => {
  const toolCallId = nextToolCallId()
  await cx.notify(methods.client.session.update, {
    sessionId: acpSessionId,
    update: {
      sessionUpdate: 'tool_call',
      toolCallId,
      title,
      kind,
      status: 'pending',
      rawInput,
    },
  })
  const res = await cx.request(methods.client.session.requestPermission, {
    sessionId: acpSessionId,
    toolCall: {
      toolCallId,
      title,
      kind,
      status: 'pending',
      rawInput,
    },
    options: buildPermissionOptions(),
  })
  const allowed = permissionAllowed(res)
  await cx.notify(methods.client.session.update, {
    sessionId: acpSessionId,
    update: {
      sessionUpdate: 'tool_call_update',
      toolCallId,
      status: allowed ? 'completed' : 'failed',
    },
  })
  return allowed
}

const handlePendingWrites = async (
  bridge: ReturnType<typeof getAcpStandaloneBridge>,
  cx: AgentContext,
  acpSessionId: string,
  sessionId: string,
  writes: PendingWritePublic[],
): Promise<AgentLoopResult> => {
  let result: AgentLoopResult | null = null
  for (const w of writes) {
    const allowed = await requestAndApplyPermission(cx, acpSessionId, w.summary || w.filePath, 'edit', {
      filePath: w.filePath,
      tool: w.tool,
    })
    result = allowed
      ? await bridge.call<AgentContinueResult>('confirmWrite', { sessionId, pendingId: w.id })
      : await bridge.call<AgentContinueResult>('rejectWrite', { sessionId, pendingId: w.id })
    if (!result.ok) return result
    if (isPending(result)) {
      return handleAllPending(bridge, cx, acpSessionId, result)
    }
  }
  return result ?? { ok: false, error: 'No pending writes' }
}

const handlePendingBashes = async (
  bridge: ReturnType<typeof getAcpStandaloneBridge>,
  cx: AgentContext,
  acpSessionId: string,
  sessionId: string,
  bashes: PendingBashPublic[],
): Promise<AgentLoopResult> => {
  let result: AgentLoopResult | null = null
  for (const b of bashes) {
    const allowed = await requestAndApplyPermission(cx, acpSessionId, b.command.slice(0, 120), 'execute', {
      command: b.command,
    })
    result = allowed
      ? await bridge.call<AgentContinueResult>('confirmBash', { sessionId, pendingId: b.id })
      : await bridge.call<AgentContinueResult>('rejectBash', { sessionId, pendingId: b.id })
    if (!result.ok) return result
    if (isPending(result)) return handleAllPending(bridge, cx, acpSessionId, result)
  }
  return result ?? { ok: false, error: 'No pending bash' }
}

const handlePendingSmart = async (
  bridge: ReturnType<typeof getAcpStandaloneBridge>,
  cx: AgentContext,
  acpSessionId: string,
  sessionId: string,
  items: PendingSmartApprovalPublic[],
): Promise<AgentLoopResult> => {
  let result: AgentLoopResult | null = null
  for (const s of items) {
    const allowed = await requestAndApplyPermission(
      cx,
      acpSessionId,
      s.summary || s.toolName,
      agentToolToAcpKind(s.toolName),
      { toolName: s.toolName, blockReason: s.blockReason, detail: s.detail },
    )
    result = allowed
      ? await bridge.call<AgentContinueResult>('confirmSmartApproval', { sessionId, pendingId: s.id })
      : await bridge.call<AgentContinueResult>('rejectSmartApproval', { sessionId, pendingId: s.id })
    if (!result.ok) return result
    if (isPending(result)) return handleAllPending(bridge, cx, acpSessionId, result)
  }
  return result ?? { ok: false, error: 'No pending smart approval' }
}

const handlePendingAsks = async (
  bridge: ReturnType<typeof getAcpStandaloneBridge>,
  cx: AgentContext,
  acpSessionId: string,
  sessionId: string,
  asks: PendingAskUserPublic[],
): Promise<AgentLoopResult> => {
  let result: AgentLoopResult | null = null
  for (const a of asks) {
    const title = a.questions.map((q) => q.prompt).join(' / ') || 'Agent question'
    const allowed = await requestAndApplyPermission(cx, acpSessionId, title, 'other', {
      questions: a.questions,
    })
    if (!allowed) {
      const answers: Record<string, string> = {}
      for (const q of a.questions) {
        answers[q.id] = q.options[0]?.label ?? 'declined'
      }
      result = await bridge.call<AgentContinueResult>('answerQuestions', {
        sessionId,
        pendingId: a.id,
        answers,
      })
    } else {
      const answers: Record<string, string> = {}
      for (const q of a.questions) {
        answers[q.id] = q.options[0]?.id ?? q.options[0]?.label ?? 'yes'
      }
      result = await bridge.call<AgentContinueResult>('answerQuestions', {
        sessionId,
        pendingId: a.id,
        answers,
      })
    }
    if (!result.ok) return result
    if (isPending(result)) return handleAllPending(bridge, cx, acpSessionId, result)
  }
  return result ?? { ok: false, error: 'No pending asks' }
}

const handlePendingPlans = async (
  bridge: ReturnType<typeof getAcpStandaloneBridge>,
  cx: AgentContext,
  acpSessionId: string,
  sessionId: string,
  plans: PendingPlanPublic[],
): Promise<AgentLoopResult> => {
  let result: AgentLoopResult | null = null
  for (const p of plans) {
    const allowed = await requestAndApplyPermission(cx, acpSessionId, p.name || 'Plan approval', 'other', {
      plan: p.plan,
      overview: p.overview,
    })
    result = allowed
      ? await bridge.call<AgentContinueResult>('buildPlan', { sessionId, pendingId: p.id })
      : await bridge.call<AgentContinueResult>('dismissPlan', { sessionId, pendingId: p.id })
    if (!result.ok) return result
    if (isPending(result)) return handleAllPending(bridge, cx, acpSessionId, result)
  }
  return result ?? { ok: false, error: 'No pending plans' }
}

const handleAllPending = async (
  bridge: ReturnType<typeof getAcpStandaloneBridge>,
  cx: AgentContext,
  acpSessionId: string,
  pending: Extract<AgentLoopResult, { ok: true; status: 'pending' }>,
): Promise<AgentLoopResult> => {
  const { sessionId, pending: writes, pendingBashes, pendingAsks, pendingPlans, pendingSmartApprovals } =
    pending
  if (writes?.length) return handlePendingWrites(bridge, cx, acpSessionId, sessionId, writes)
  if (pendingBashes?.length)
    return handlePendingBashes(bridge, cx, acpSessionId, sessionId, pendingBashes)
  if (pendingSmartApprovals?.length)
    return handlePendingSmart(bridge, cx, acpSessionId, sessionId, pendingSmartApprovals)
  if (pendingAsks?.length) return handlePendingAsks(bridge, cx, acpSessionId, sessionId, pendingAsks)
  if (pendingPlans?.length) return handlePendingPlans(bridge, cx, acpSessionId, sessionId, pendingPlans)
  return pending
}

const runAgentUntilDone = async (
  bridge: ReturnType<typeof getAcpStandaloneBridge>,
  cx: AgentContext,
  acpSessionId: string,
  initial: AgentLoopResult,
): Promise<AgentLoopResult> => {
  let result = initial
  while (result.ok && result.status === 'pending') {
    result = await handleAllPending(bridge, cx, acpSessionId, result)
  }
  return result
}

export const createAxecoderAcpApp = (): AgentApp => {
  const bridge = getAcpStandaloneBridge()

  return createAgent({ name: 'axecoder', version: '0.9.8' })
    .onRequest(methods.agent.initialize, async () => ({
      protocolVersion: PROTOCOL_VERSION,
      agentCapabilities: {
        loadSession: false,
        promptCapabilities: {
          text: true,
          image: false,
          audio: false,
          embeddedContext: false,
        },
      },
      agentInfo: {
        name: 'AxeCoder',
        title: 'AxeCoder Agent',
        version: '0.9.8',
      },
    }))
    .onRequest(methods.agent.authenticate, async () => ({}))
    .onRequest(methods.agent.session.new, async (ctx) => {
      const cwd = ctx.params.cwd?.trim() || process.cwd()
      const acpSessionId = newAcpSessionId()
      createAcpSession(acpSessionId, cwd)
      return { sessionId: acpSessionId }
    })
    .onRequest(methods.agent.session.prompt, async (ctx) => {
      const session = getAcpSession(ctx.params.sessionId)
      if (!session) throw new Error(`Session ${ctx.params.sessionId} not found`)

      const userText = extractPromptText(ctx.params.prompt as PromptRequest['prompt'])
      if (!userText.trim()) throw new Error('Empty prompt')

      session.abortController?.abort()
      session.abortController = new AbortController()

      const modelId = await resolveActiveModelId()
      if (!modelId) throw new Error('No active model configured')

      session.messages.push({ role: 'user', content: userText })

      bridge.setProgressListener((payload) => {
        if (payload.sessionId && !session.agentSessionId) {
          session.agentSessionId = payload.sessionId
        }
        if (
          session.agentSessionId &&
          payload.sessionId &&
          payload.sessionId !== session.agentSessionId
        ) {
          return
        }
        void emitProgressAsAcp(ctx.client, session.acpSessionId, payload)
      })

      try {
        let result = await bridge.call<AgentSendResult>('send', {
          projectRoot: session.projectRoot,
          modelId,
          messages: session.messages,
          chatMode: 'agent',
        })

        if (!result.ok) throw new Error(result.error)
        if ('sessionId' in result && result.sessionId) {
          session.agentSessionId = result.sessionId
        }

        result = await runAgentUntilDone(bridge, ctx.client, session.acpSessionId, result)

        if (!result.ok) throw new Error(result.error)
        if (result.status === 'done' && result.assistantText) {
          session.messages.push({ role: 'assistant', content: result.assistantText })
          if (result.assistantText.trim()) {
            await ctx.client.notify(methods.client.session.update, {
              sessionId: session.acpSessionId,
              update: {
                sessionUpdate: 'agent_message_chunk',
                content: { type: 'text', text: result.assistantText },
              },
            })
          }
        }

        if (session.abortController?.signal.aborted) {
          return { stopReason: 'cancelled' as const }
        }
        return { stopReason: 'end_turn' as const }
      } finally {
        bridge.setProgressListener(null)
        session.abortController = null
      }
    })
    .onNotification(methods.agent.session.cancel, async (ctx) => {
      const session = getAcpSession(ctx.params.sessionId)
      if (!session) return
      session.abortController?.abort()
      if (session.agentSessionId) {
        await bridge.call('stop', { sessionId: session.agentSessionId })
      }
    })
}
