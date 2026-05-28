import type { AiChatMessage, AiChatResult, ModelEntry } from '../models-types'
import { chatOpenAi } from './providers/openai'
import { chatOllama } from './providers/ollama'
import { chatAnthropic } from './providers/anthropic'

export const chatWithProvider = async (
  model: ModelEntry,
  apiKey: string,
  messages: AiChatMessage[],
): Promise<AiChatResult> => {
  if (!model.enabled) return { ok: false, error: '模型已禁用' }
  if (model.provider === 'openai') {
    if (!apiKey.trim()) return { ok: false, error: 'OpenAI 格式需要 API Key' }
    return chatOpenAi(model.baseUrl, model.modelId, apiKey, messages)
  }
  if (model.provider === 'ollama') {
    return chatOllama(model.baseUrl, model.modelId, apiKey, messages)
  }
  return chatAnthropic(model.baseUrl, model.modelId, apiKey, messages)
}
