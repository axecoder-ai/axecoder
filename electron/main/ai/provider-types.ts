import type { AgentLoopMessage, AgentToolCall, AgentToolDef } from '../agent/agent-types'
import type { AiChatMessage, AiChatResult, AiTokenUsage, ModelEntry } from '../models-types'
import type { AiProviderCapabilities, ModelProvider } from '../../../shared/ai/provider-capabilities'
import type { ReasoningEffortLevel } from '../../../shared/reasoning-effort'
import type { OpenAiStreamDelta } from './providers/openai'

export type ChatWithToolsResult =
  | {
      ok: true
      text: string
      content: string
      reasoningContent?: string
      toolCalls: AgentToolCall[]
      usage?: AiTokenUsage
    }
  | { ok: false; error: string }

export type PlainChatParams = {
  model: ModelEntry
  apiKey: string
  messages: AiChatMessage[]
  onDelta?: (delta: OpenAiStreamDelta) => void
  apiModelId?: string
  reasoningEffort?: ReasoningEffortLevel
}

export type ToolsChatParams = {
  model: ModelEntry
  apiKey: string
  messages: AgentLoopMessage[]
  onDelta?: (delta: OpenAiStreamDelta) => void
  tools?: readonly AgentToolDef[]
  abortSignal?: AbortSignal
  apiModelId?: string
  reasoningEffort?: ReasoningEffortLevel
}

export interface AiProviderAdapter {
  readonly id: ModelProvider
  readonly capabilities: AiProviderCapabilities
  chat(params: PlainChatParams): Promise<AiChatResult>
  chatWithTools(params: ToolsChatParams): Promise<ChatWithToolsResult>
}
