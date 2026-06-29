import { computed, reactive, ref } from 'vue'
import type { ChatModeId } from '../utils/chat-modes'
import { canPickChatMode } from '../utils/chat-modes'
import { applyProgressPayload, appendContentDeltaToActiveModelStep, type AgentProgressPayload } from '../utils/agent-progress'
import { resolveProgressChatId } from '../utils/chat-progress-route'
import { detectThinkingType } from '../utils/thinking-parser'
import {
  createEmptyRunState,
  deriveTabDotStatus,
  mergeSubagentTaskProgress,
  resetRunProgress,
  type ChatSessionRunState,
  type ChatTabDotStatus,
} from '../utils/chat-session-run-state'
import type { ChatMessage } from '../types/axecoder'

type UseChatSessionRunsOpts = {
  getActiveChatId: () => string
  getMessagesForChat: (chatId: string) => ChatMessage[]
  hasSessionMessagesForModeLock: () => boolean
  getChatModeId: () => ChatModeId
  setChatModeId: (id: ChatModeId) => void
  onToolProgressDone?: (chatId: string, agentSessionId: string) => void
  onScroll?: () => void
}

export const useChatSessionRuns = (opts: UseChatSessionRunsOpts) => {
  const runStates = reactive<Record<string, ChatSessionRunState>>({})
  const agentToChat = ref<Record<string, string>>({})
  let progressUnsub: (() => void) | null = null

  const ensureRunState = (chatId: string): ChatSessionRunState => {
    if (!runStates[chatId]) {
      runStates[chatId] = createEmptyRunState()
    }
    return runStates[chatId]
  }

  const getRunState = (chatId: string) => ensureRunState(chatId)

  const activeRun = computed(() => {
    const id = opts.getActiveChatId()
    return id ? ensureRunState(id) : createEmptyRunState()
  })

  const loading = computed(() => activeRun.value.loading)
  const pendingBusy = computed(() => activeRun.value.pendingBusy)
  const progressSteps = computed(() => activeRun.value.progressSteps)
  const streamText = computed(() => activeRun.value.streamText)
  const thinkingText = computed(() => activeRun.value.thinkingText)
  const thinkingType = computed(() => activeRun.value.thinkingType)
  const loopGuardNotice = computed(() => activeRun.value.loopGuardNotice)
  const runningAgentSessionId = computed(() => activeRun.value.runningAgentSessionId)
  const subagentTaskList = computed(() => activeRun.value.subagentTasks)
  const agentProgressActive = computed(() => activeRun.value.loading || activeRun.value.pendingBusy)

  const linkAgentSession = (chatId: string, agentSessionId: string) => {
    if (!chatId || !agentSessionId) return
    const run = ensureRunState(chatId)
    run.runningAgentSessionId = agentSessionId
    agentToChat.value = { ...agentToChat.value, [agentSessionId]: chatId }
  }

  const applyProgressToChat = (chatId: string, payload: AgentProgressPayload) => {
    const run = ensureRunState(chatId)
    if (payload.sessionId) linkAgentSession(chatId, payload.sessionId)

    if (payload.kind === 'delta' || payload.kind === 'content_delta') {
      const routed = appendContentDeltaToActiveModelStep(run.progressSteps, payload.delta)
      if (routed.changed) {
        run.progressSteps = routed.steps
      } else if (!run.isAgentRun) {
        run.streamText += payload.delta
      }
    } else if (payload.kind === 'thinking_delta') {
      run.thinkingText += payload.delta
      run.thinkingType = detectThinkingType(run.thinkingText)
    } else if (payload.kind === 'subagent') {
      run.subagentTasks = mergeSubagentTaskProgress(run.subagentTasks, {
        taskId: payload.taskId,
        description: payload.description,
        status: payload.status,
      })
    } else if (payload.kind === 'loop_guard') {
      run.loopGuardNotice = payload.text
    } else if (payload.kind === 'chat_mode') {
      if (
        chatId === opts.getActiveChatId() &&
        canPickChatMode(opts.getChatModeId(), payload.chatMode, opts.hasSessionMessagesForModeLock())
      ) {
        opts.setChatModeId(payload.chatMode)
      }
    } else if (payload.kind === 'tool' && payload.status === 'done' && payload.ok) {
      opts.onToolProgressDone?.(chatId, payload.sessionId)
      run.progressSteps = applyProgressPayload(run.progressSteps, payload)
    } else if (payload.kind === 'model' || payload.kind === 'tool') {
      run.progressSteps = applyProgressPayload(run.progressSteps, payload)
    }

    if (payload.kind !== 'thinking_delta' && chatId === opts.getActiveChatId()) {
      opts.onScroll?.()
    }
  }

  const handleAgentProgress = (payload: AgentProgressPayload) => {
    if (!('sessionId' in payload) || !payload.sessionId) return
    const chatId = resolveProgressChatId(payload, agentToChat.value)
    if (!chatId) return
    if (payload.clientChatId?.trim() && payload.sessionId) {
      linkAgentSession(payload.clientChatId.trim(), payload.sessionId)
    }
    applyProgressToChat(chatId, payload)
  }

  const beginRun = (chatId: string) => {
    const run = ensureRunState(chatId)
    resetRunProgress(run)
    run.loading = true
    run.completedUnread = false
  }

  const endRun = (chatId: string, markUnreadIfInactive = false) => {
    const run = runStates[chatId]
    if (!run) return
    const agentSid = run.runningAgentSessionId
    run.loading = false
    if (markUnreadIfInactive && chatId !== opts.getActiveChatId()) {
      run.completedUnread = true
    }
    resetRunProgress(run)
    if (agentSid) {
      const next = { ...agentToChat.value }
      delete next[agentSid]
      agentToChat.value = next
    }
  }

  const clearRunProgress = (chatId: string) => {
    const run = runStates[chatId]
    if (!run) return
    resetRunProgress(run)
  }

  const setPendingBusy = (chatId: string, busy: boolean) => {
    ensureRunState(chatId).pendingBusy = busy
  }

  const isRunning = (chatId: string) => {
    const run = runStates[chatId]
    return !!(run?.loading || run?.pendingBusy)
  }

  const clearUnread = (chatId: string) => {
    const run = runStates[chatId]
    if (run) run.completedUnread = false
  }

  const tabDotFor = (chatId: string, isActiveTab: boolean): ChatTabDotStatus | null =>
    deriveTabDotStatus(ensureRunState(chatId), opts.getMessagesForChat(chatId), isActiveTab)

  const appendStreamText = (chatId: string, delta: string) => {
    ensureRunState(chatId).streamText += delta
  }

  const setupProgressListener = () => {
    progressUnsub?.()
    progressUnsub = window.axecoder.onAgentProgress(handleAgentProgress)
  }

  const teardownProgressListener = () => {
    progressUnsub?.()
    progressUnsub = null
  }

  const bindAgentProgress = (chatId: string, agentSessionId?: string) => {
    if (agentSessionId) linkAgentSession(chatId, agentSessionId)
  }

  return {
    loading,
    pendingBusy,
    progressSteps,
    streamText,
    thinkingText,
    thinkingType,
    loopGuardNotice,
    subagentTaskList,
    runningAgentSessionId,
    agentProgressActive,
    getRunState,
    beginRun,
    endRun,
    clearRunProgress,
    setPendingBusy,
    isRunning,
    clearUnread,
    tabDotFor,
    appendStreamText,
    linkAgentSession,
    setupProgressListener,
    teardownProgressListener,
    bindAgentProgress,
  }
}
