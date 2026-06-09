/**
 * Thinking 内容类型定义
 */

export type ThinkingChunkType = 'tool_call' | 'tool_result' | 'reasoning'

export interface ThinkingChunk {
  id: string
  type: ThinkingChunkType
  content: string
  timestamp: number
  collapsed: boolean
}

export interface ToolCall {
  toolName: string
  parameters: Array<{ name: string; value: string }>
}

/**
 * IPC payload 类型
 */
export interface AgentStreamThinkingPayload {
  delta: string
  metadata: {
    timestamp: number
    type: ThinkingChunkType
  }
}

export interface AgentStreamContentPayload {
  delta: string
}
