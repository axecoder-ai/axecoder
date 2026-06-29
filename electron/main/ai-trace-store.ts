import { pushAiMetricsActivity } from './ai-metrics-store'
import { isAgentWorkerProcess, requestMainProcess } from './agent/main-process-delegate'
import { broadcastToRenderers } from './renderer-broadcast'

export type AiTraceSource = 'chat' | 'agent' | 'workshop' | 'other'

export type AiTraceEventKind = 'model_call' | 'tool_call' | 'tool_result'

export type AiTraceEvent = {
  id: string
  ts: number
  kind: AiTraceEventKind
  source: AiTraceSource
  sessionId?: string
  turn?: number
  modelId?: string
  modelName?: string
  provider?: string
  toolName?: string
  ok?: boolean
  durationMs?: number
  request?: string
  response?: string
  detail?: string
}

export type AiTraceState = {
  recording: boolean
  events: AiTraceEvent[]
  eventCount: number
}

const MAX_EVENTS = 300
const KEY_RE = /(api[_-]?key|authorization|bearer|token|secret)/i

let recording = false
let seq = 0
const events: AiTraceEvent[] = []

export const sanitizeForTrace = (value: unknown): unknown => {
  if (value === null || value === undefined) return value
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean') return value
  if (Array.isArray(value)) return value.map(sanitizeForTrace)
  if (typeof value === 'object') {
    const obj = value as Record<string, unknown>
    const out: Record<string, unknown> = {}
    for (const [k, v] of Object.entries(obj)) {
      if (KEY_RE.test(k)) {
        out[k] = '[redacted]'
        continue
      }
      if (k === 'images' && Array.isArray(v)) {
        out[k] = v.map((img) => {
          const row = img as { mimeType?: string; data?: string }
          const size = typeof row.data === 'string' ? row.data.length : 0
          return { mimeType: row.mimeType ?? 'image', size, summary: `image/${row.mimeType ?? '?'} ${size} chars base64 omitted` }
        })
        continue
      }
      out[k] = sanitizeForTrace(v)
    }
    return out
  }
  return String(value)
}

const toJson = (value: unknown) => JSON.stringify(sanitizeForTrace(value), null, 2)

const pushEvent = (partial: Omit<AiTraceEvent, 'id' | 'ts'>) => {
  if (!recording) return
  const ev: AiTraceEvent = { id: `tr-${Date.now()}-${++seq}`, ts: Date.now(), ...partial }
  events.push(ev)
  if (events.length > MAX_EVENTS) events.splice(0, events.length - MAX_EVENTS)
  broadcastToRenderers('aiTrace:update', getAiTraceState())
}

export const isAiTraceRecording = () => recording

export const setAiTraceRecording = (on: boolean) => {
  recording = on
  broadcastToRenderers('aiTrace:update', getAiTraceState())
}

export const clearAiTraceEvents = () => {
  events.length = 0
  broadcastToRenderers('aiTrace:update', getAiTraceState())
}

export const getAiTraceState = (): AiTraceState => ({
  recording,
  events: [...events],
  eventCount: events.length,
})

export const getAiTraceEventsForExport = () => [...events]

export const traceModelCall = (input: {
  source: AiTraceSource
  sessionId?: string
  turn?: number
  modelId: string
  modelName: string
  provider: string
  requestMessages: unknown
  result: { ok: boolean; text?: string; content?: string; reasoningContent?: string; toolCalls?: unknown[]; error?: string }
  durationMs: number
}) => {
  if (isAgentWorkerProcess()) {
    void requestMainProcess('traceModelCall', input)
    return
  }
  const turnTag = input.turn ? ` · T${input.turn}` : ''
  pushAiMetricsActivity({
    kind: 'model_call',
    ok: input.result.ok,
    modelId: input.modelId,
    source: input.source,
    text: input.result.ok
      ? `${input.modelName} · ${input.durationMs}ms · ${input.source}${turnTag}`
      : `${input.modelName} · ${input.durationMs}ms · ${input.result.error ?? 'error'}${turnTag}`,
  })
  pushEvent({
    kind: 'model_call',
    source: input.source,
    sessionId: input.sessionId,
    turn: input.turn,
    modelId: input.modelId,
    modelName: input.modelName,
    provider: input.provider,
    ok: input.result.ok,
    durationMs: input.durationMs,
    request: toJson(input.requestMessages),
    response: toJson(
      input.result.ok
        ? {
            text: input.result.text,
            content: input.result.content,
            reasoningContent: input.result.reasoningContent,
            toolCalls: input.result.toolCalls,
          }
        : { error: input.result.error },
    ),
  })
}

export const traceToolCall = (input: {
  sessionId: string
  turn: number
  toolName: string
  args: unknown
}) => {
  pushAiMetricsActivity({
    kind: 'tool_call',
    source: 'agent',
    text: `${input.toolName} · T${input.turn}`,
  })
  pushEvent({
    kind: 'tool_call',
    source: 'agent',
    sessionId: input.sessionId,
    turn: input.turn,
    toolName: input.toolName,
    detail: toJson(input.args),
  })
}

export const traceToolResult = (input: {
  sessionId: string
  turn: number
  toolName: string
  ok: boolean
  content?: string
  error?: string
}) => {
  const preview = input.ok
    ? (input.content ?? '').replace(/\s+/g, ' ').trim().slice(0, 48)
    : (input.error ?? 'fail')
  pushAiMetricsActivity({
    kind: 'tool_result',
    ok: input.ok,
    source: 'agent',
    text: `${input.toolName} · T${input.turn} · ${input.ok ? preview || 'ok' : preview}`,
  })
  pushEvent({
    kind: 'tool_result',
    source: 'agent',
    sessionId: input.sessionId,
    turn: input.turn,
    toolName: input.toolName,
    ok: input.ok,
    response: toJson(input.error ? { error: input.error } : { content: input.content ?? '' }),
  })
}

export const resetAiTraceStore = () => {
  recording = false
  events.length = 0
}
