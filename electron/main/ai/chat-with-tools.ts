import type { ModelEntry } from '../models-types'
import type { AgentLoopMessage, AgentToolCall, AgentToolDef } from '../agent/agent-types'
import { AGENT_TOOLS } from '../agent/agent-tool-defs'
import { buildOpenAiChatUrl } from './providers/openai'
import { buildAnthropicMessagesUrl } from './providers/anthropic'
import { AI_REQUEST_TIMEOUT_MS, formatAiFetchError } from './request-timeout'
import { agentLoopToOpenAiWire, parseOpenAiAssistantParts } from './openai-messages'
import {
  consumeOpenAiSse,
  emptyOpenAiStreamAccum,
  mergeOpenAiStreamChunk,
  openAiStreamAccumToMessage,
} from './openai-sse'
import type { OpenAiStreamDelta } from './providers/openai'

export type ChatWithToolsResult =
  | {
      ok: true
      text: string
      content: string
      reasoningContent?: string
      toolCalls: AgentToolCall[]
    }
  | { ok: false; error: string }

const openAiTools = (tools: readonly AgentToolDef[]) =>
  tools.map((t) => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.parameters,
    },
  }))

const parseOpenAiToolCalls = (message: Record<string, unknown>): AgentToolCall[] => {
  const raw = message.tool_calls
  if (!Array.isArray(raw)) return []
  const out: AgentToolCall[] = []
  for (const item of raw) {
    const row = item as Record<string, unknown>
    const fn = row.function as Record<string, unknown> | undefined
    if (!fn || typeof fn.name !== 'string') continue
    let args: Record<string, unknown> = {}
    try {
      args = JSON.parse(String(fn.arguments ?? '{}')) as Record<string, unknown>
    } catch {
      args = {}
    }
    out.push({
      id: String(row.id ?? ''),
      name: fn.name as AgentToolCall['name'],
      arguments: args,
    })
  }
  return out
}

export const chatOpenAiWithTools = async (
  model: ModelEntry,
  apiKey: string,
  messages: AgentLoopMessage[],
  onDelta?: (delta: OpenAiStreamDelta) => void,
  tools: readonly AgentToolDef[] = AGENT_TOOLS,
): Promise<ChatWithToolsResult> => {
  const url = buildOpenAiChatUrl(model.baseUrl)
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (apiKey.trim()) headers.Authorization = `Bearer ${apiKey.trim()}`
  const useStream = !!onDelta
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        model: model.modelId,
        messages: agentLoopToOpenAiWire(messages),
        tools: openAiTools(tools),
        tool_choice: 'auto',
        stream: useStream,
      }),
      signal: AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS),
    })
    if (!res.ok) {
      const errText = await res.text()
      return { ok: false, error: `请求失败 (${res.status}): ${errText.slice(0, 300)}` }
    }
    let message: Record<string, unknown>
    if (useStream) {
      const accum = emptyOpenAiStreamAccum()
      await consumeOpenAiSse(res, (obj) => {
        const { contentDelta, reasoningDelta } = mergeOpenAiStreamChunk(accum, obj)
        if (contentDelta) onDelta!({ content: contentDelta })
        if (reasoningDelta) onDelta!({ reasoning: reasoningDelta })
      })
      message = openAiStreamAccumToMessage(accum)
    } else {
      const data = (await res.json()) as { choices?: { message?: Record<string, unknown> }[] }
      message = data.choices?.[0]?.message ?? {}
    }
    const parts = parseOpenAiAssistantParts(message)
    const toolCalls = parseOpenAiToolCalls(message)
    return {
      ok: true,
      text: parts.displayText,
      content: parts.content,
      reasoningContent: parts.reasoningContent,
      toolCalls,
    }
  } catch (e) {
    return { ok: false, error: formatAiFetchError(e) }
  }
}

const anthropicTools = (tools: readonly AgentToolDef[]) =>
  tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters,
  }))

const toAnthropicMessages = (messages: AgentLoopMessage[]) => {
  const out: { role: 'user' | 'assistant'; content: unknown }[] = []
  let i = 0
  while (i < messages.length) {
    const m = messages[i]
    if (m.role === 'system') {
      i += 1
      continue
    }
    if (m.role === 'user') {
      out.push({ role: 'user', content: m.content })
      i += 1
      continue
    }
    if (m.role === 'assistant') {
      if (m.toolCalls?.length) {
        const blocks: unknown[] = []
        if (m.content) blocks.push({ type: 'text', text: m.content })
        for (const tc of m.toolCalls) {
          blocks.push({
            type: 'tool_use',
            id: tc.id,
            name: tc.name,
            input: tc.arguments,
          })
        }
        out.push({ role: 'assistant', content: blocks })
      } else {
        out.push({ role: 'assistant', content: m.content })
      }
      i += 1
      continue
    }
    if (m.role === 'tool') {
      const results: unknown[] = []
      while (i < messages.length && messages[i].role === 'tool') {
        const t = messages[i] as Extract<AgentLoopMessage, { role: 'tool' }>
        results.push({
          type: 'tool_result',
          tool_use_id: t.toolCallId,
          content: t.content,
        })
        i += 1
      }
      out.push({ role: 'user', content: results })
      continue
    }
    i += 1
  }
  return out
}

export const chatAnthropicWithTools = async (
  model: ModelEntry,
  apiKey: string,
  messages: AgentLoopMessage[],
  tools: readonly AgentToolDef[] = AGENT_TOOLS,
): Promise<ChatWithToolsResult> => {
  if (!apiKey.trim()) return { ok: false, error: 'Anthropic 需要 API Key' }
  const system = messages.find((m) => m.role === 'system')?.content ?? ''
  const url = buildAnthropicMessagesUrl(model.baseUrl)
  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: model.modelId,
        max_tokens: 4096,
        system,
        messages: toAnthropicMessages(messages),
        tools: anthropicTools(tools),
      }),
      signal: AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS),
    })
    if (!res.ok) {
      const errText = await res.text()
      return { ok: false, error: `请求失败 (${res.status}): ${errText.slice(0, 300)}` }
    }
    const data = (await res.json()) as {
      content?: { type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }[]
    }
    const blocks = data.content ?? []
    let text = ''
    const toolCalls: AgentToolCall[] = []
    for (const b of blocks) {
      if (b.type === 'text' && b.text) text += b.text
      if (b.type === 'tool_use' && b.id && b.name) {
        toolCalls.push({
          id: b.id,
          name: b.name as AgentToolCall['name'],
          arguments: b.input ?? {},
        })
      }
    }
    return { ok: true, text, toolCalls }
  } catch (e) {
    return { ok: false, error: formatAiFetchError(e) }
  }
}

export const chatWithToolsForModel = async (
  model: ModelEntry,
  apiKey: string,
  messages: AgentLoopMessage[],
  onDelta?: (delta: OpenAiStreamDelta) => void,
  tools: readonly AgentToolDef[] = AGENT_TOOLS,
): Promise<ChatWithToolsResult> => {
  if (model.provider === 'ollama') {
    return { ok: false, error: 'Ollama 暂不支持 Agent 文件工具，请使用 OpenAI 或 Anthropic' }
  }
  if (model.provider === 'openai') {
    if (!apiKey.trim()) return { ok: false, error: 'OpenAI 格式需要 API Key' }
    return chatOpenAiWithTools(model, apiKey, messages, onDelta, tools)
  }
  return chatAnthropicWithTools(model, apiKey, messages, tools)
}
