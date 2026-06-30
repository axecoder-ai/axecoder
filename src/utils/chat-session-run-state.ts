import type { ChatMessage } from '../types/axecoder'
import type { AgentProgressStep } from './agent-progress'

export type SubagentTaskView = {
  id: string
  description: string
  status: 'running' | 'completed' | 'failed' | 'stopped'
}

export type ChatTabDotStatus = 'running' | 'pending' | 'completed-unread'

export type ChatSessionRunState = {
  loading: boolean
  pendingBusy: boolean
  progressSteps: AgentProgressStep[]
  streamText: string
  thinkingText: string
  thinkingType: string
  loopGuardNotice: string
  subagentTasks: SubagentTaskView[]
  runningAgentSessionId: string
  pendingAssigneeUserId: string
  completedUnread: boolean
  /** Agent 模式运行：中间轮次 content 进时间轴，不单独预览 */
  isAgentRun: boolean
}

export const createEmptyRunState = (): ChatSessionRunState => ({
  loading: false,
  pendingBusy: false,
  progressSteps: [],
  streamText: '',
  thinkingText: '',
  thinkingType: '',
  loopGuardNotice: '',
  subagentTasks: [],
  runningAgentSessionId: '',
  pendingAssigneeUserId: '',
  completedUnread: false,
  isAgentRun: false,
})

export const sessionHasPendingInteraction = (messages: ChatMessage[]) =>
  messages.some(
    (m) =>
      (m.pendingWrites?.length ?? 0) > 0 ||
      (m.pendingBashes?.length ?? 0) > 0 ||
      (m.pendingSmartApprovals?.length ?? 0) > 0 ||
      (m.pendingAsks?.length ?? 0) > 0 ||
      (m.pendingPlans?.length ?? 0) > 0,
  )

export const deriveTabDotStatus = (
  run: ChatSessionRunState,
  messages: ChatMessage[],
  isActiveTab: boolean,
): ChatTabDotStatus | null => {
  if (run.loading || run.pendingBusy) return 'running'
  if (sessionHasPendingInteraction(messages)) return 'pending'
  if (run.completedUnread && !isActiveTab) return 'completed-unread'
  return null
}

export const mergeSubagentTaskProgress = (
  tasks: SubagentTaskView[],
  payload: {
    taskId: string
    description: string
    status: SubagentTaskView['status']
  },
): SubagentTaskView[] => {
  const idx = tasks.findIndex((t) => t.id === payload.taskId)
  if (idx < 0) {
    return [
      ...tasks,
      {
        id: payload.taskId,
        description: payload.description,
        status: payload.status,
      },
    ]
  }
  const cur = tasks[idx]!
  const terminal = cur.status === 'completed' || cur.status === 'failed' || cur.status === 'stopped'
  if (terminal && payload.status === 'running') return tasks
  const next = [...tasks]
  next[idx] = {
    ...cur,
    description: payload.description || cur.description,
    status: payload.status,
  }
  return next
}

export const resetRunProgress = (run: ChatSessionRunState) => {
  run.progressSteps = []
  run.streamText = ''
  run.thinkingText = ''
  run.thinkingType = ''
  run.loopGuardNotice = ''
  run.subagentTasks = []
  run.runningAgentSessionId = ''
  run.pendingAssigneeUserId = ''
  run.isAgentRun = false
}
