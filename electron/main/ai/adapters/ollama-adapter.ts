import { PROVIDER_CAPABILITIES } from '../../../../shared/ai/provider-capabilities'
import type { AiProviderAdapter } from '../provider-types'
import { chatOllama } from '../providers/ollama'
import { openAiAdapter } from './openai-adapter'

export const ollamaAdapter: AiProviderAdapter = {
  id: 'ollama',
  capabilities: PROVIDER_CAPABILITIES.ollama,
  chat: async ({ model, apiKey, messages, apiModelId }) =>
    chatOllama(
      model.baseUrl,
      (apiModelId?.trim() || model.modelId).trim(),
      apiKey,
      messages,
    ),
  chatWithTools: async (params) => openAiAdapter.chatWithTools(params),
}
