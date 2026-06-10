export type ModelProvider = 'openai' | 'ollama' | 'anthropic' | 'codex'

export type AiProviderCapabilities = {
  requiresApiKey: boolean
  supportsSseStream: boolean
  defaultBaseUrl: string
  displayName: string
  missingApiKeyError?: string
}

export const PROVIDER_CAPABILITIES: Record<ModelProvider, AiProviderCapabilities> = {
  openai: {
    requiresApiKey: true,
    supportsSseStream: true,
    defaultBaseUrl: 'https://api.openai.com/v1',
    displayName: 'OpenAI',
    missingApiKeyError: 'OpenAI-compatible API requires an API Key',
  },
  codex: {
    requiresApiKey: true,
    supportsSseStream: true,
    defaultBaseUrl: 'https://api.openai.com/v1',
    displayName: 'Codex',
    missingApiKeyError: 'Codex (Responses API) requires an API Key',
  },
  ollama: {
    requiresApiKey: false,
    supportsSseStream: false,
    defaultBaseUrl: 'http://127.0.0.1:11434',
    displayName: 'Ollama',
  },
  anthropic: {
    requiresApiKey: true,
    supportsSseStream: false,
    defaultBaseUrl: 'https://api.anthropic.com',
    displayName: 'Anthropic',
    missingApiKeyError: 'Anthropic requires an API Key',
  },
}

export const providerRequiresApiKey = (provider: ModelProvider): boolean =>
  PROVIDER_CAPABILITIES[provider].requiresApiKey

export const providerSupportsSseStream = (provider: ModelProvider): boolean =>
  PROVIDER_CAPABILITIES[provider].supportsSseStream

export const defaultBaseUrl = (provider: ModelProvider): string =>
  PROVIDER_CAPABILITIES[provider].defaultBaseUrl

export const getProviderCapabilities = (provider: ModelProvider): AiProviderCapabilities =>
  PROVIDER_CAPABILITIES[provider]

export const listAllProviderCapabilities = (): Record<ModelProvider, AiProviderCapabilities> =>
  PROVIDER_CAPABILITIES
