import type { AgentLoopMessage } from './agent-types'
import { estimateContextChars } from './agent-frc'
import { chatWithProvider } from '../ai/chat-with-provider'
import { resolveApiModelId } from '../ai/api-model-resolve'
import { getConfig } from '../config-store'
import { getModelById } from '../models-store'
import { getSecret } from '../secrets-store'

export const COMPACT_SUMMARY_PREFIX = '<system-reminder>\nConversation compacted. Earlier summary:\n'
const COMPACT_SUMMARY_SUFFIX = '\n</system-reminder>'
const PER_MSG_TOOL_CAP = 2000
const PER_MSG_DEFAULT_CAP = 4000
const DROPPED_TRANSCRIPT_CAP = 60_000
const SUMMARY_OUTPUT_CAP = 8000

export type CompactLlmOpts = {
  modelId: string
  sessionId?: string
  /** 多轮 compact 时合并的滚动摘要 */
  priorSummary?: string
}

export const extractPriorCompactSummary = (messages: AgentLoopMessage[]): string => {
  for (const m of messages) {
    if (m.role !== 'user') continue
    const content = m.content ?? ''
    if (!content.startsWith(COMPACT_SUMMARY_PREFIX)) continue
    const end = content.indexOf(COMPACT_SUMMARY_SUFFIX, COMPACT_SUMMARY_PREFIX.length)
    if (end < 0) continue
    return content.slice(COMPACT_SUMMARY_PREFIX.length, end).trim()
  }
  return ''
}

const COMPACT_LLM_SYSTEM = `You compress conversation history for a coding agent.
Summarize the transcript below into concise prose the agent can rely on to continue work.
Preserve: user goals, decisions made, file paths edited or read, errors encountered, unfinished tasks.
Omit: redundant tool dumps, pleasantries, repeated attempts.
Write in the same language as the conversation. Max 1200 words. Plain text only, no markdown fences.`

const clip = (s: string, max: number) => (s.length <= max ? s : `${s.slice(0, max)}…`)

const splitForCompact = (messages: AgentLoopMessage[], keepTail: number) => {
  const system = messages.filter((m) => m.role === 'system')
  const rest = messages.filter((m) => m.role !== 'system')
  const tail = rest.slice(-keepTail)
  const dropped = rest.slice(0, rest.length - keepTail)
  return { system, tail, dropped }
}

export const ruleCompactSummary = (dropped: AgentLoopMessage[]): string => {
  const userAssistantCount = dropped.filter((m) => m.role === 'user' || m.role === 'assistant').length
  const toolCleared = dropped.filter((m) => m.role === 'tool').length
  return `Dropped ${dropped.length} older messages (${userAssistantCount} user/assistant, ${toolCleared} tool). Key details may have been lost — re-read files if needed.`
}

const formatMessageLine = (m: AgentLoopMessage): string => {
  if (m.role === 'tool') {
    const body = clip(String(m.content ?? ''), PER_MSG_TOOL_CAP)
    return `[tool:${m.name ?? 'unknown'}] ${body}`
  }
  if (m.role === 'assistant' && m.toolCalls?.length) {
    const names = m.toolCalls.map((t) => t.name).join(', ')
    const text = clip(String(m.content ?? ''), 800)
    return `[assistant+tools:${names}] ${text}`
  }
  return `[${m.role}] ${clip(String(m.content ?? ''), PER_MSG_DEFAULT_CAP)}`
}

export const serializeMessagesForCompact = (messages: AgentLoopMessage[]): string => {
  let text = messages.map(formatMessageLine).join('\n')
  if (text.length > DROPPED_TRANSCRIPT_CAP) {
    text = `${text.slice(0, DROPPED_TRANSCRIPT_CAP)}\n…(transcript truncated for summarization)`
  }
  return text
}

export const summarizeDroppedWithLlm = async (
  dropped: AgentLoopMessage[],
  opts: CompactLlmOpts,
): Promise<{ ok: true; summary: string } | { ok: false; error: string }> => {
  if (!dropped.length) return { ok: true, summary: '' }
  const model = await getModelById(opts.modelId)
  if (!model?.enabled) return { ok: false, error: 'Model not found or disabled' }
  const apiKey = await getSecret(opts.modelId)
  const cfg = await getConfig()
  const routingEnabled = cfg.agentModelTierRoutingEnabled !== false
  const apiModelId = resolveApiModelId(model, 'fast', '', routingEnabled)
  const transcript = serializeMessagesForCompact(dropped)
  const prior = opts.priorSummary?.trim()
  const userContent = prior
    ? `Previous conversation summary (merge and update; keep all prior facts):\n${prior}\n\nNew transcript (${dropped.length} messages):\n\n${transcript}`
    : `Transcript (${dropped.length} messages):\n\n${transcript}`
  const res = await chatWithProvider(
    model,
    apiKey,
    [
      { role: 'system', content: COMPACT_LLM_SYSTEM },
      { role: 'user', content: userContent },
    ],
    undefined,
    apiModelId,
    'agent',
    { sessionId: opts.sessionId },
  )
  if (!res.ok) return { ok: false, error: res.error }
  const summary = res.text.trim()
  if (!summary) return { ok: false, error: 'Empty LLM summary' }
  return { ok: true, summary: clip(summary, SUMMARY_OUTPUT_CAP) }
}

const buildCompactedMessages = (
  system: AgentLoopMessage[],
  tail: AgentLoopMessage[],
  summary: string,
): AgentLoopMessage[] => {
  const compactUserMsg: AgentLoopMessage = {
    role: 'user',
    content: `${COMPACT_SUMMARY_PREFIX}${summary}${COMPACT_SUMMARY_SUFFIX}`,
  }
  return [...system, compactUserMsg, ...tail]
}

export const shouldAutoCompact = (messages: AgentLoopMessage[], thresholdChars: number) =>
  estimateContextChars(messages) > thresholdChars

/** 规则压缩：保留 system + Recent N 条非 system，中间折叠为摘要占位 */
export const compactAgentMessages = (
  messages: AgentLoopMessage[],
  keepTail = 24,
): { messages: AgentLoopMessage[]; summary: string } => {
  if (messages.length <= keepTail + 1) {
    return { messages: [...messages], summary: '' }
  }

  const { system, tail, dropped } = splitForCompact(messages, keepTail)
  const summary = ruleCompactSummary(dropped)
  return {
    messages: buildCompactedMessages(system, tail, summary),
    summary,
  }
}

/** LLM 摘要压缩；无 modelId 或 LLM 失败时回退规则摘要 */
export const compactAgentMessagesWithLlm = async (
  messages: AgentLoopMessage[],
  keepTail = 24,
  llmOpts?: CompactLlmOpts,
): Promise<{ messages: AgentLoopMessage[]; summary: string; usedLlm: boolean }> => {
  if (messages.length <= keepTail + 1) {
    return { messages: [...messages], summary: '', usedLlm: false }
  }

  const { system, tail, dropped } = splitForCompact(messages, keepTail)
  let summary = ruleCompactSummary(dropped)
  let usedLlm = false

  if (llmOpts?.modelId?.trim()) {
    const llm = await summarizeDroppedWithLlm(dropped, {
      modelId: llmOpts.modelId.trim(),
      sessionId: llmOpts.sessionId,
      priorSummary: llmOpts.priorSummary,
    })
    if (llm.ok) {
      summary = llm.summary
      usedLlm = true
    }
  }

  return {
    messages: buildCompactedMessages(system, tail, summary),
    summary,
    usedLlm,
  }
}
