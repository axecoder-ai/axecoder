import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { buildOpenAiChatUrl } from '../../../electron/main/ai/providers/openai'
import { buildOllamaChatUrl } from '../../../electron/main/ai/providers/ollama'
import { buildAnthropicMessagesUrl } from '../../../electron/main/ai/providers/anthropic'
import { chatWithProvider } from '../../../electron/main/ai/chat-with-provider'
import type { ModelEntry } from '../../../electron/main/models-types'

describe('provider url builders', () => {
  it('openai base 自动补 /v1', () => {
    expect(buildOpenAiChatUrl('https://api.deepseek.com')).toContain('/chat/completions')
    expect(buildOpenAiChatUrl('https://api.openai.com/v1')).toContain('/v1/chat/completions')
  })

  it('ollama 使用 /api/chat', () => {
    expect(buildOllamaChatUrl('http://127.0.0.1:11434')).toBe('http://127.0.0.1:11434/api/chat')
  })

  it('anthropic 使用 /v1/messages', () => {
    expect(buildAnthropicMessagesUrl('https://api.anthropic.com')).toBe(
      'https://api.anthropic.com/v1/messages',
    )
  })
})

describe('chatWithProvider', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it('openai 成功解析 reasoning_content', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        choices: [{ message: { content: '', reasoning_content: 'from reasoning' } }],
      }),
    })
    const model: ModelEntry = {
      id: '1',
      name: 't',
      provider: 'openai',
      modelId: 'deepseek-reasoner',
      baseUrl: 'https://api.deepseek.com/v1',
      enabled: true,
    }
    const res = await chatWithProvider(model, 'sk-x', [{ role: 'user', content: 'hello' }])
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.text).toBe('from reasoning')
  })

  it('openai 成功解析回复', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({ choices: [{ message: { content: 'hi' } }] }),
    })
    const model: ModelEntry = {
      id: '1',
      name: 't',
      provider: 'openai',
      modelId: 'gpt-4',
      baseUrl: 'https://api.openai.com/v1',
      enabled: true,
    }
    const res = await chatWithProvider(model, 'sk-x', [{ role: 'user', content: 'hello' }])
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.text).toBe('hi')
    expect(fetchMock.mock.calls[0][0]).toContain('chat/completions')
  })

  it('禁用模型返回错误', async () => {
    const model: ModelEntry = {
      id: '1',
      name: 't',
      provider: 'openai',
      modelId: 'gpt-4',
      baseUrl: 'https://api.openai.com/v1',
      enabled: false,
    }
    const res = await chatWithProvider(model, 'sk-x', [{ role: 'user', content: 'hi' }])
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toMatch(/disabled/i)
  })
})
