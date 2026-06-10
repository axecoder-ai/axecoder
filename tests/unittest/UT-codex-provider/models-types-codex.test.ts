import { describe, expect, it } from 'vitest'
import {
  defaultBaseUrl,
  providerRequiresApiKey,
  providerSupportsSseStream,
} from '../../../electron/main/models-types'

describe('codex provider helpers', () => {
  it('defaultBaseUrl 与 openai 相同', () => {
    expect(defaultBaseUrl('codex')).toBe('https://api.openai.com/v1')
  })

  it('requires api key', () => {
    expect(providerRequiresApiKey('codex')).toBe(true)
    expect(providerRequiresApiKey('ollama')).toBe(false)
  })

  it('supports sse stream', () => {
    expect(providerSupportsSseStream('codex')).toBe(true)
    expect(providerSupportsSseStream('anthropic')).toBe(false)
  })
})
