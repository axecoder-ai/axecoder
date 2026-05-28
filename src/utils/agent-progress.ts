export type AgentProgressPhase = 'model' | 'tool'

export type AgentProgressStep = {
  id: string
  phase: AgentProgressPhase
  turn: number
  label: string
  status: 'active' | 'done' | 'error'
}

export type AgentProgressPayload = {
  sessionId: string
  turn: number
  kind: 'model' | 'tool'
  status: 'start' | 'done'
  toolName?: string
  summary?: string
  ok?: boolean
}

export const labelForModelTurn = (turn: number) => `第 ${turn} 轮：正在调用模型…`

export const labelForToolStart = (toolName: string, summary: string) =>
  `正在执行 ${toolName}：${summary}`

export const labelForToolDone = (toolName: string, summary: string, ok: boolean) =>
  ok ? `${toolName} 完成` : `${toolName} 失败：${summary}`

/** 普通单轮聊天无工具进度时的轮换提示 */
export const CHAT_IDLE_HINTS = [
  '正在思考…',
  '正在组织回复…',
  '仍在处理，请稍候…',
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
        return next
      }
    }
    next.push({
      id: nextStepId(),
      phase: 'tool',
      turn: payload.turn,
      label: labelForToolDone(name, summary, ok),
      status: ok ? 'done' : 'error',
    })
    return next
  }

  return next
}
