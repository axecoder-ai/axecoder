import { reactive, computed } from 'vue'
import type { ThinkingChunk, AgentStreamThinkingPayload } from '../types/thinking'
import { estimateTokens } from '../utils/token-estimator'

interface AgentState {
  thinkingChunks: ThinkingChunk[]
  contentStream: string
  currentThinkingChunk: ThinkingChunk | null
  currentThinkingText: string
  thinkingType: string
}

export function createAgentStore() {
  const state = reactive<AgentState>({
    thinkingChunks: [],
    contentStream: '',
    currentThinkingChunk: null,
    currentThinkingText: '',
    thinkingType: '',
  })

  /**
   * 添加 thinking delta
   */
  function addThinkingDelta(payload: AgentStreamThinkingPayload) {
    const { delta, metadata } = payload

    // 如果是新的类型或没有当前 chunk，创建新 chunk
    if (!state.currentThinkingChunk || state.currentThinkingChunk.type !== metadata.type) {
      state.currentThinkingChunk = {
        id: `chunk-${Date.now()}-${Math.random()}`,
        type: metadata.type,
        content: delta,
        timestamp: metadata.timestamp,
        collapsed: false,
      }
      state.thinkingChunks.push(state.currentThinkingChunk)
    } else {
      // 追加到当前 chunk
      state.currentThinkingChunk.content += delta
    }
  }

  /**
   * 添加 content delta
   */
  function addContentDelta(delta: string) {
    state.contentStream += delta
  }

  /** ChatPane / WorkshopPane 使用的 thinking 流式追加 */
  function appendThinking(delta: string) {
    if (!delta) return
    state.currentThinkingText += delta
    addThinkingDelta({
      delta,
      metadata: { timestamp: Date.now(), type: 'reasoning' },
    })
  }

  function setThinkingType(type: string) {
    state.thinkingType = type
  }

  /**
   * 切换 chunk 折叠状态
   */
  function toggleChunkCollapse(chunkId: string) {
    const chunk = state.thinkingChunks.find((c) => c.id === chunkId)
    if (chunk) {
      chunk.collapsed = !chunk.collapsed
    }
  }

  /**
   * 展开所有 chunks
   */
  function expandAll() {
    state.thinkingChunks.forEach((chunk) => {
      chunk.collapsed = false
    })
  }

  /**
   * 折叠所有 chunks
   */
  function collapseAll() {
    state.thinkingChunks.forEach((chunk) => {
      chunk.collapsed = true
    })
  }

  /**
   * 清空所有 thinking 数据
   */
  function clearThinking() {
    state.thinkingChunks.splice(0, state.thinkingChunks.length)
    state.currentThinkingChunk = null
    state.contentStream = ''
    state.currentThinkingText = ''
    state.thinkingType = ''
  }

  // Getters
  const totalTokens = computed(() => {
    return state.thinkingChunks.reduce((sum, chunk) => sum + estimateTokens(chunk.content), 0)
  })

  const toolCallCount = computed(() => {
    return state.thinkingChunks.filter((c) => c.type === 'tool_call').length
  })

  const toolResultCount = computed(() => {
    return state.thinkingChunks.filter((c) => c.type === 'tool_result').length
  })

  const reasoningCount = computed(() => {
    return state.thinkingChunks.filter((c) => c.type === 'reasoning').length
  })

  return {
    // State (direct access to reactive state)
    thinkingChunks: state.thinkingChunks,
    contentStream: computed(() => state.contentStream),
    currentThinkingChunk: computed(() => state.currentThinkingChunk),
    get currentThinking() {
      return state.currentThinkingText
    },
    get thinkingType() {
      return state.thinkingType
    },

    // Actions
    addThinkingDelta,
    addContentDelta,
    appendThinking,
    setThinkingType,
    toggleChunkCollapse,
    expandAll,
    collapseAll,
    clearThinking,
    
    // Getters
    totalTokens,
    toolCallCount,
    toolResultCount,
    reasoningCount,
  }
}

// 单例实例供组件使用
let globalStore: ReturnType<typeof createAgentStore> | null = null

export function useAgentStore() {
  if (!globalStore) {
    globalStore = createAgentStore()
  }
  return globalStore
}

