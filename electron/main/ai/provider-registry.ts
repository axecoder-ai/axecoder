import type { ModelProvider } from '../../../shared/ai/provider-capabilities'
import { anthropicAdapter } from './adapters/anthropic-adapter'
import { codexAdapter } from './adapters/codex-adapter'
import { ollamaAdapter } from './adapters/ollama-adapter'
import { openAiAdapter } from './adapters/openai-adapter'
import type { AiProviderAdapter } from './provider-types'

const PROVIDER_REGISTRY: Record<ModelProvider, AiProviderAdapter> = {
  openai: openAiAdapter,
  anthropic: anthropicAdapter,
  ollama: ollamaAdapter,
  codex: codexAdapter,
}

export const getProviderAdapter = (provider: ModelProvider): AiProviderAdapter =>
  PROVIDER_REGISTRY[provider]

export const listProviderAdapters = (): AiProviderAdapter[] => Object.values(PROVIDER_REGISTRY)
