import { getModelById } from '../models-store'
import { getSecret } from '../secrets-store'
import { resolveApiModelIdForTask } from '../ai/api-model-resolve'
import { chatWithToolsForModel } from '../ai/chat-with-tools'
import { modelTaskKindForSubagentType } from '../ai/model-resolve'
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
  /** 默认 6；Workshop 等探索型任务可加大 */
  maxTurns?: number
  /** 用尽轮次时若有 assistant Text则返回阶段性报告，而非硬failed */
  partialReportOnMaxTurns?: boolean
}

export const runSubAgentTask = async (
  projectRoot: string,
  modelId: string,
  taskPrompt: string,
  options?: RunSubAgentOptions,
): Promise<{ ok: true; report: string } | { ok: false; error: string }> => {
  const prompt = taskPrompt.trim()
  if (!prompt) return { ok: false, error: 'Sub-agent prompt is required' }

  const model = await getModelById(modelId)
  if (!model) return { ok: false, error: 'Model not found' }
  const apiKey = await getSecret(modelId)
  const subagentType = options?.subagentType || 'generalPurpose'
  const tools = options?.tools ?? buildSubAgentToolList(subagentType)

  const ctx: AgentContext = {
    projectRoot,
    readCache: new Set<string>(),
    modelId,
    subAgentDepth: 1,
    planMode: subagentType === 'plan' || subagentType === 'explore',
  }

  const messages: AgentLoopMessage[] = [
    {
      role: 'system',
      content: await buildDefaultSubAgentSystemPrompt(projectRoot, {
        modelId: model.modelId,
      }),
    },
    { role: 'user', content: prompt },
  ]

  const pendingById = new Map<string, PendingWriteInternal>()
  const pendingBashById = new Map<string, PendingBashInternal>()
  const pendingAskById = new Map<string, PendingAskUserInternal>()

  const maxTurns = Math.min(
    Math.max(options?.maxTurns ?? DEFAULT_MAX_SUB_TURNS, 1),
    MAX_SUB_TURNS_CAP,
  )

  const taskKind = modelTaskKindForSubagentType(subagentType)
  const apiModelId = await resolveApiModelIdForTask(model, taskKind, prompt)

  let turn = 0
  while (turn < maxTurns) {
    turn += 1
    const res = await chatWithToolsForModel(
      model,
      apiKey,
      messages,
      options?.onDelta,
      tools,
      undefined,
      apiModelId,
    )
    if (!res.ok) return { ok: false, error: res.error }

    if (res.toolCalls.length) {
      messages.push({
        role: 'assistant',
        content: res.content,
        reasoningContent: res.reasoningContent,
        toolCalls: res.toolCalls,
      })

      const toolResults = await Promise.all(
        res.toolCalls.map(async (tc) => ({ tc, run: await executeAgentTool(ctx, tc) })),
      )
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
    return { ok: true, report }
  }

  if (options?.partialReportOnMaxTurns) {
    const partial = lastAssistantReport(messages)
    if (partial) {
      return {
        ok: true,
        report: `${partial}\n\n(max tool turns ${maxTurns} reached; partial conclusion above—continue or split the task.)`,
      }
    }
  }
  return { ok: false, error: `Sub-agent exceeded max tool turns (${maxTurns})` }
}

export const formatAgentToolSummary = (args: Record<string, unknown>) =>
  strArg(args, 'description') || strArg(args, 'prompt').slice(0, 80) || 'Agent'
