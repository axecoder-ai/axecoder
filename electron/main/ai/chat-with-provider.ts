import type { AiChatMessage, AiChatResult, ModelEntry } from '../models-types'
import { chatOpenAi, type OpenAiStreamDelta } from './providers/openai'
import { chatOllama } from './providers/ollama'
import { chatAnthropic } from './providers/anthropic'

export const chatWithProvider = async (
  model: ModelEntry,
  apiKey: string,
  messages: AiChatMessage[],
  onDelta?: (delta: OpenAiStreamDelta) => void,
  apiModelId?: string,
): Promise<AiChatResult> => {
  if (!model.enabled) return { ok: false, error: '模型已禁用' }
  const apiName = (apiModelId?.trim() || model.modelId).trim()
  if (model.provider === 'openai') {
    if (!apiKey.trim()) return { ok: false, error: 'OpenAI 格式需要 API Key' }
    return chatOpenAi(model.baseUrl, apiName, apiKey, messages, onDelta)
  }
  if (model.provider === 'ollama') {
    return chatOllama(model.baseUrl, apiName, apiKey, messages)
  }
  return chatAnthropic(model.baseUrl, apiName, apiKey, messages)
}
