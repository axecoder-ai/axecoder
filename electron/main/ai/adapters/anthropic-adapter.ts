import type { AgentLoopMessage, AgentToolCall, AgentToolDef } from '../../agent/agent-types'
import type { AiTokenUsage, ModelEntry } from '../../models-types'
import { resolveAgentToolName, normalizeAgentToolCall } from '../../agent/agent-tool-aliases'
import { AGENT_TOOLS } from '../../agent/agent-tool-defs'
import { userMessageToAnthropicContent } from '../ai-message-images'
import { fetchAiWithRetry, formatAiRequestFailedError } from '../ai-request-retry'
import { AI_REQUEST_TIMEOUT_MS, formatAiFetchError } from '../request-timeout'
import { PROVIDER_CAPABILITIES } from '../../../../shared/ai/provider-capabilities'
import type { AiProviderAdapter } from '../provider-types'
import { buildAnthropicMessagesUrl, chatAnthropic } from '../providers/anthropic'

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
      const content =
        m.images?.length ? userMessageToAnthropicContent(m.content, m.images) : m.content
      out.push({ role: 'user', content })
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

const mergeAbortSignal = (userSignal?: AbortSignal) => {
  const timeout = AbortSignal.timeout(AI_REQUEST_TIMEOUT_MS)
  if (!userSignal) return timeout
  return AbortSignal.any([timeout, userSignal])
}

export const chatAnthropicWithTools = async (
  model: ModelEntry,
  apiKey: string,
  messages: AgentLoopMessage[],
  tools: readonly AgentToolDef[] = AGENT_TOOLS,
  abortSignal?: AbortSignal,
  apiModelId?: string,
) => {
  if (!apiKey.trim()) return { ok: false as const, error: 'Anthropic requires an API Key' }
  const system = messages.find((m) => m.role === 'system')?.content ?? ''
  const url = buildAnthropicMessagesUrl(model.baseUrl)
  try {
    const { res, meta } = await fetchAiWithRetry(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey.trim(),
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: (apiModelId?.trim() || model.modelId).trim(),
        max_tokens: 4096,
        system,
        messages: toAnthropicMessages(messages),
        tools: anthropicTools(tools),
      }),
      signal: mergeAbortSignal(abortSignal),
    })
    if (!res.ok) {
      const errText = await res.text()
      return { ok: false as const, error: formatAiRequestFailedError(res.status, errText, meta) }
    }
    const data = (await res.json()) as {
      content?: { type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }[]
      usage?: { input_tokens?: number; output_tokens?: number }
    }
    const blocks = data.content ?? []
    let text = ''
    const toolCalls: AgentToolCall[] = []
    for (const b of blocks) {
      if (b.type === 'text' && b.text) text += b.text
      if (b.type === 'tool_use' && b.id && b.name) {
        toolCalls.push(
          normalizeAgentToolCall({
            id: b.id,
            name: (resolveAgentToolName(b.name) ?? b.name) as AgentToolCall['name'],
            arguments: b.input ?? {},
          }),
        )
      }
    }
    const usage: AiTokenUsage | undefined =
      data.usage &&
      (typeof data.usage.input_tokens === 'number' || typeof data.usage.output_tokens === 'number')
        ? {
            promptTokens: data.usage.input_tokens ?? 0,
            completionTokens: data.usage.output_tokens ?? 0,
            estimated: false,
          }
        : undefined
    return { ok: true as const, text, content: text, toolCalls, usage }
  } catch (e) {
    return { ok: false as const, error: formatAiFetchError(e) }
  }
}

export const anthropicAdapter: AiProviderAdapter = {
  id: 'anthropic',
  capabilities: PROVIDER_CAPABILITIES.anthropic,
  chat: async ({ model, apiKey, messages, apiModelId }) =>
    chatAnthropic(
      model.baseUrl,
      (apiModelId?.trim() || model.modelId).trim(),
      apiKey,
      messages,
    ),
  chatWithTools: async ({ model, apiKey, messages, tools, abortSignal, apiModelId }) =>
    chatAnthropicWithTools(model, apiKey, messages, tools, abortSignal, apiModelId),
}
