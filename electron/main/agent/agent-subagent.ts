import { getModelById } from '../models-store'
import { getSecret } from '../secrets-store'
import { chatWithToolsForModel } from '../ai/chat-with-tools'
import { SUB_AGENT_TOOLS, buildDefaultSubAgentSystemPrompt } from './agent-tool-defs'
import type { AgentLoopMessage } from './agent-types'
import {
  executeAgentTool,
  type AgentContext,
  type PendingAskUserInternal,
  type PendingBashInternal,
  type PendingWriteInternal,
} from './tool-executor'

const MAX_SUB_TURNS = 6

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
export const runSubAgentTask = async (
  projectRoot: string,
  modelId: string,
  taskPrompt: string,
): Promise<{ ok: true; report: string } | { ok: false; error: string }> => {
  const prompt = taskPrompt.trim()
  if (!prompt) return { ok: false, error: 'Sub-agent prompt is required' }

  const model = await getModelById(modelId)
  if (!model) return { ok: false, error: '模型不存在' }
  if (model.provider === 'ollama') {
    return { ok: false, error: 'Ollama 暂不支持子代理' }
  }

  const apiKey = await getSecret(modelId)
  const ctx: AgentContext = {
    projectRoot,
    readCache: new Set<string>(),
    modelId,
    subAgentDepth: 1,
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

  let turn = 0
  while (turn < MAX_SUB_TURNS) {
    turn += 1
    const res = await chatWithToolsForModel(model, apiKey, messages, undefined, SUB_AGENT_TOOLS)
    if (!res.ok) return { ok: false, error: res.error }

    if (res.toolCalls.length) {
      messages.push({
        role: 'assistant',
        content: res.content,
        reasoningContent: res.reasoningContent,
        toolCalls: res.toolCalls,
      })

      for (const tc of res.toolCalls) {
        const run = await executeAgentTool(ctx, tc)
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

    const report = res.text.trim() || res.content.trim() || '（子代理未返回内容）'
    return { ok: true, report }
  }

  return { ok: false, error: `Sub-agent exceeded max turns (${MAX_SUB_TURNS})` }
}

export const formatAgentToolSummary = (args: Record<string, unknown>) =>
  strArg(args, 'description') || strArg(args, 'prompt').slice(0, 80) || 'Agent'
