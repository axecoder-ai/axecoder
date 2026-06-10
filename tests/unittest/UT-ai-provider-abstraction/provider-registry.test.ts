import { describe, expect, it } from 'vitest'
import { getProviderAdapter, listProviderAdapters } from '../../../electron/main/ai/provider-registry'
import {
  defaultBaseUrl,
  providerRequiresApiKey,
  providerSupportsSseStream,
} from '../../../shared/ai/provider-capabilities'

describe('provider registry', () => {
  it('注册四个内置 Provider', () => {
    expect(listProviderAdapters().map((a) => a.id).sort()).toEqual([
      'anthropic',
      'codex',
      'ollama',
      'openai',
    ])
  })

  it('adapter capabilities 与 shared 一致', () => {
    for (const id of ['openai', 'codex', 'ollama', 'anthropic'] as const) {
      const adapter = getProviderAdapter(id)
      expect(adapter.capabilities.requiresApiKey).toBe(providerRequiresApiKey(id))
      expect(adapter.capabilities.supportsSseStream).toBe(providerSupportsSseStream(id))
      expect(adapter.capabilities.defaultBaseUrl).toBe(defaultBaseUrl(id))
    }
  })

  it('openai 与 codex 支持 SSE', () => {
    expect(getProviderAdapter('openai').capabilities.supportsSseStream).toBe(true)
    expect(getProviderAdapter('codex').capabilities.supportsSseStream).toBe(true)
  })

  it('ollama 不需要 API Key', () => {
    expect(getProviderAdapter('ollama').capabilities.requiresApiKey).toBe(false)
  })
})
