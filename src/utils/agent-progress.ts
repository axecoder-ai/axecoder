import type { ChatModeId } from './chat-modes'

export type AgentProgressPhase = 'model' | 'tool'

export type AgentProgressStep = {
  id: string
  phase: AgentProgressPhase
  turn: number
  label: string
  status: 'active' | 'done' | 'error'
  toolName?: string
  summary?: string
  /** Model reply or tool stdout/stderr snapshot when step completes */
  detail?: string
}

export const PROGRESS_COLLAPSE_KEEP = 5

type AgentProgressBase = {
  sessionId: string
  /** 渲染进程 chat session id，用于多 Tab 并发时精确路由 */
  clientChatId?: string
}

export type AgentProgressPayload =
  | (AgentProgressBase & {
      turn: number
      kind: 'model' | 'tool'
      status: 'start' | 'done'
      toolName?: string
      summary?: string
      ok?: boolean
      detail?: string
    })
  | (AgentProgressBase & {
      kind: 'delta'
      delta: string
    })
  | (AgentProgressBase & {
      kind: 'content_delta'
      delta: string
    })
  | (AgentProgressBase & {
      kind: 'thinking_delta'
      delta: string
    })
  | (AgentProgressBase & {
      kind: 'subagent'
      taskId: string
      status: 'running' | 'completed' | 'failed' | 'stopped'
      description: string
    })
  | (AgentProgressBase & {
      kind: 'loop_guard'
      text: string
    })
  | (AgentProgressBase & {
      kind: 'chat_mode'
      chatMode: ChatModeId
      planMode: boolean
    })

export const labelForModelTurn = (turn: number) => `Turn ${turn}: calling model…`

export const labelForModelDone = (turn: number) => `Turn ${turn}: model reply done`

export const labelForToolStart = (toolName: string, summary: string) =>
  `Running ${toolName}: ${summary}`

export const labelForToolDone = (toolName: string, summary: string, ok: boolean) =>
  ok ? `${toolName} done` : `${toolName} failed：${summary}`

/** Rotating hints when chat has no tool progress */
export const CHAT_IDLE_HINTS = [
  'Thinking…',
  'Organizing reply…',
  'Still working, please wait…',
]

let stepSeq = 0
const nextStepId = () => `step-${Date.now()}-${stepSeq++}`

const markActiveDone = (steps: AgentProgressStep[]) => {
  for (const s of steps) {
    if (s.status === 'active') s.status = 'done'
  }
}

export const applyProgressPayload = (
  steps: AgentProgressStep[],
  payload: AgentProgressPayload,
): AgentProgressStep[] => {
  const next = steps.map((s) => ({ ...s }))

  if (payload.kind === 'model' && payload.status === 'start') {
    markActiveDone(next)
    next.push({
      id: nextStepId(),
      phase: 'model',
      turn: payload.turn,
      label: labelForModelTurn(payload.turn),
      status: 'active',
    })
    return next
  }

  if (payload.kind === 'model' && payload.status === 'done') {
    for (let i = next.length - 1; i >= 0; i--) {
      const s = next[i]
      if (s.phase === 'model' && s.status === 'active' && s.turn === payload.turn) {
        s.status = 'done'
        s.label = labelForModelDone(payload.turn)
        if (payload.detail?.trim()) s.detail = payload.detail
        return next
      }
    }
    return next
  }

  if (payload.kind === 'delta' || payload.kind === 'content_delta' || payload.kind === 'thinking_delta') {
    return next
  }

  if (payload.kind === 'tool' && payload.status === 'start') {
    markActiveDone(next)
    const name = payload.toolName ?? 'Tool'
    const summary = payload.summary ?? ''
    next.push({
      id: nextStepId(),
      phase: 'tool',
      turn: payload.turn,
      label: labelForToolStart(name, summary),
      status: 'active',
      toolName: name,
      summary,
    })
    return next
  }

  if (payload.kind === 'tool' && payload.status === 'done') {
    const name = payload.toolName ?? 'Tool'
    const summary = payload.summary ?? ''
    const ok = payload.ok !== false
    for (let i = next.length - 1; i >= 0; i--) {
      const s = next[i]
      if (s.phase === 'tool' && s.status === 'active' && s.turn === payload.turn) {
        s.status = ok ? 'done' : 'error'
        s.label = labelForToolDone(name, summary, ok)
        s.toolName = name
        s.summary = summary
        if (payload.detail?.trim()) s.detail = payload.detail
        return next
      }
    }
    next.push({
      id: nextStepId(),
      phase: 'tool',
      turn: payload.turn,
      label: labelForToolDone(name, summary, ok),
      status: ok ? 'done' : 'error',
      toolName: name,
      summary,
      ...(payload.detail?.trim() ? { detail: payload.detail } : {}),
    })
    return next
  }

  return next
}

export const activeProgressHeadline = (steps: AgentProgressStep[]): string => {
  const active = [...steps].reverse().find((s) => s.status === 'active')
  if (!active) return 'Working…'
  if (active.phase === 'model') return 'Thinking…'
  if (active.toolName) return active.toolName
  return active.label
}

export const sliceProgressStepsForDisplay = (
  steps: AgentProgressStep[],
  expanded: boolean,
  keep = PROGRESS_COLLAPSE_KEEP,
): { visible: AgentProgressStep[]; hiddenCount: number } => {
  if (expanded || steps.length <= keep) return { visible: steps, hiddenCount: 0 }
  const inactive = steps.filter((s) => s.status !== 'active')
  const active = steps.filter((s) => s.status === 'active')
  if (inactive.length <= keep) return { visible: steps, hiddenCount: 0 }
  const hiddenCount = inactive.length - keep
  return { visible: [...inactive.slice(-keep), ...active], hiddenCount }
}
