import { getModelById } from '../models-store'
import { getSecret } from '../secrets-store'
import { resolveApiModelIdForTask } from '../ai/api-model-resolve'
import { chatWithToolsForModel } from '../ai/chat-with-tools'
import type { OpenAiStreamDelta } from '../ai/providers/openai'
import type { AgentToolDef } from './agent-types'
import { buildDefaultSubAgentSystemPrompt } from './agent-tool-defs'
import { buildSubAgentToolList } from './agent-tool-registry'
import type { AgentLoopMessage } from './agent-types'
import {
  executeAgentTool,
  type AgentContext,
  type PendingAskUserInternal,
  type PendingBashInternal,
  type PendingWriteInternal,
} from './tool-executor'
import { getSubagentTypeConfig, normalizeSubagentType } from './agent-subagent-types'
import {
  createSubagentAgentId,
  loadSubagentRecord,
  saveSubagentRecord,
} from './agent-subagent-store'
import type { AiChatImagePart } from '../models-types'

const DEFAULT_MAX_SUB_TURNS = 6
const MAX_SUB_TURNS_CAP = 24

const lastAssistantReport = (messages: AgentLoopMessage[]): string => {
  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i]
    if (m.role !== 'assistant') continue
    const text = (m.content ?? '').trim()
    if (text) return text
  }
  return ''
}

const strArg = (args: Record<string, unknown>, key: string) => {
  const v = args[key]
  return typeof v === 'string' && v.trim() ? v.trim() : ''
}

const applySubAgentPending = async (
  pendingById: Map<string, PendingWriteInternal>,
  pendingBashById: Map<string, PendingBashInternal>,
  messages: AgentLoopMessage[],
) => {
  for (const pending of pendingById.values()) {
    const applied = await pending.apply()
    if (!applied.ok) return applied
    const toolMsg = messages.find(
      (m) => m.role === 'tool' && m.toolCallId === pending.toolCallId,
    )
    if (toolMsg && toolMsg.role === 'tool') {
      toolMsg.content = `Applied: ${pending.summary}`
    }
  }
  pendingById.clear()

  for (const pending of pendingBashById.values()) {
    const applied = await pending.apply()
    if (!applied.ok) return applied
    const toolMsg = messages.find(
      (m) => m.role === 'tool' && m.toolCallId === pending.toolCallId,
    )
    if (toolMsg && toolMsg.role === 'tool') {
      toolMsg.content = applied.content
    }
  }
  pendingBashById.clear()

  return { ok: true as const }
}

/** 内联子代理循环（不注册 session store；写/Bash 自动执行） */
export type RunSubAgentOptions = {
  subagentType?: string
  tools?: AgentToolDef[]
  onDelta?: (delta: OpenAiStreamDelta) => void
  maxTurns?: number
  partialReportOnMaxTurns?: boolean
  readonly?: boolean
  modelIdOverride?: string
  sessionId?: string
  resumeAgentId?: string
  abortSignal?: AbortSignal
  fileAttachments?: string[]
  images?: AiChatImagePart[]
}

export type RunSubAgentResult =
  | { ok: true; report: string; agentId: string }
  | { ok: false; error: string }

export const runSubAgentTask = async (
  projectRoot: string,
  modelId: string,
  taskPrompt: string,
  options?: RunSubAgentOptions,
): Promise<RunSubAgentResult> => {
  const prompt = taskPrompt.trim()
  if (!prompt) return { ok: false, error: 'Sub-agent prompt is required' }

  const subagentType = normalizeSubagentType(options?.subagentType || 'generalPurpose')
  const typeCfg = getSubagentTypeConfig(subagentType)
  const resolvedModelId = options?.modelIdOverride?.trim() || modelId
  const model = await getModelById(resolvedModelId)
  if (!model) return { ok: false, error: 'Model not found' }
  const apiKey = await getSecret(resolvedModelId)
  const tools =
    options?.tools ??
    buildSubAgentToolList(subagentType, options?.readonly === true || typeCfg.readOnly)

  const readOnly = options?.readonly === true || typeCfg.readOnly
  const ctx: AgentContext = {
    projectRoot,
    readCache: new Set<string>(),
    modelId: resolvedModelId,
    subAgentDepth: 1,
    planMode: readOnly || subagentType === 'plan' || subagentType === 'explore',
    sessionId: options?.sessionId,
  }

  let agentId = options?.resumeAgentId?.trim() || ''
  let messages: AgentLoopMessage[] = []

  if (agentId && options?.sessionId) {
    const stored = await loadSubagentRecord(projectRoot, options.sessionId, agentId)
    if (stored?.messages?.length) {
      messages = [...stored.messages]
    } else {
      agentId = ''
    }
  }
  if (!agentId) agentId = createSubagentAgentId()

  if (!messages.length) {
    const prefix = typeCfg.promptPrefix.trim()
    const systemBase = await buildDefaultSubAgentSystemPrompt(projectRoot, {
      modelId: model.modelId,
    })
    const systemContent = prefix ? `${prefix}\n\n${systemBase}` : systemBase
    messages = [{ role: 'system', content: systemContent }]
  }

  const attachmentNote =
    options?.fileAttachments?.length ?
      `\n\n<file_attachments>\n${options.fileAttachments.join('\n')}\n</file_attachments>`
    : ''
  messages.push({
    role: 'user',
    content: prompt + attachmentNote,
    ...(options?.images?.length ? { images: options.images } : {}),
  })

  const pendingById = new Map<string, PendingWriteInternal>()
  const pendingBashById = new Map<string, PendingBashInternal>()
  const pendingAskById = new Map<string, PendingAskUserInternal>()

  const maxTurns = Math.min(
    Math.max(options?.maxTurns ?? typeCfg.maxTurns ?? DEFAULT_MAX_SUB_TURNS, 1),
    MAX_SUB_TURNS_CAP,
  )

  const apiModelId = await resolveApiModelIdForTask(model, typeCfg.modelTaskKind, prompt)

  let turn = 0
  while (turn < maxTurns) {
    if (options?.abortSignal?.aborted) {
      return { ok: false, error: 'Sub-agent interrupted' }
    }
    turn += 1
    const res = await chatWithToolsForModel(
      model,
      apiKey,
      messages,
      options?.onDelta,
      tools,
      options?.abortSignal,
      apiModelId,
    )
    if (options?.abortSignal?.aborted) {
      return { ok: false, error: 'Sub-agent interrupted' }
    }
    if (!res.ok) return { ok: false, error: res.error }

    if (res.toolCalls.length) {
      messages.push({
        role: 'assistant',
        content: res.content,
        reasoningContent: res.reasoningContent,
        toolCalls: res.toolCalls,
      })

      if (options?.abortSignal?.aborted) {
        return { ok: false, error: 'Sub-agent interrupted' }
      }
      const toolResults = await Promise.all(
        res.toolCalls.map(async (tc) => ({ tc, run: await executeAgentTool(ctx, tc) })),
      )
      if (options?.abortSignal?.aborted) {
        return { ok: false, error: 'Sub-agent interrupted' }
      }
      for (const { tc, run } of toolResults) {
        if (run.kind === 'pending') {
          pendingById.set(run.pending.id, run.pending)
          messages.push({
            role: 'tool',
            toolCallId: tc.id,
            name: tc.name,
            content: 'Pending user approval for this change.',
          })
        } else if (run.kind === 'bash_pending') {
          pendingBashById.set(run.pendingBash.id, run.pendingBash)
          messages.push({
            role: 'tool',
            toolCallId: tc.id,
            name: tc.name,
            content: 'Pending user approval to run this command.',
          })
        } else if (run.kind === 'ask_pending') {
          pendingAskById.set(run.pendingAsk.id, run.pendingAsk)
          messages.push({
            role: 'tool',
            toolCallId: tc.id,
            name: tc.name,
            content: 'Error: Sub-agents cannot use AskUserQuestion.',
          })
        } else {
          messages.push({
            role: 'tool',
            toolCallId: tc.id,
            name: tc.name,
            content: run.content,
          })
        }
      }

      if (pendingAskById.size > 0) {
        pendingAskById.clear()
        messages.push({
          role: 'user',
          content:
            'Sub-agents cannot ask the user questions. Continue with your best judgment or report what is blocking.',
        })
        continue
      }

      if (pendingById.size > 0 || pendingBashById.size > 0) {
        const applied = await applySubAgentPending(pendingById, pendingBashById, messages)
        if (!applied.ok) return { ok: false, error: applied.error }
      }
      continue
    }

    const report = res.text.trim() || res.content.trim() || '(sub-agent returned no content)'
    if (options?.sessionId) {
      await saveSubagentRecord(projectRoot, {
        agentId,
        sessionId: options.sessionId,
        subagentType,
        messages,
        updatedAt: Date.now(),
      })
    }
    return { ok: true, report, agentId }
  }

  if (options?.partialReportOnMaxTurns) {
    const partial = lastAssistantReport(messages)
    if (partial) {
      const report = `${partial}\n\n(max tool turns ${maxTurns} reached; partial conclusion above—continue or split the task.)`
      if (options?.sessionId) {
        await saveSubagentRecord(projectRoot, {
          agentId,
          sessionId: options.sessionId,
          subagentType,
          messages,
          updatedAt: Date.now(),
        })
      }
      return { ok: true, report, agentId }
    }
  }
  return { ok: false, error: `Sub-agent exceeded max tool turns (${maxTurns})` }
}

export const formatAgentToolSummary = (args: Record<string, unknown>) =>
  strArg(args, 'description') || strArg(args, 'prompt').slice(0, 80) || 'Task'
