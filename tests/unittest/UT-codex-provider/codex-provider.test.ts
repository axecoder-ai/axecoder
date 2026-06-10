import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'

vi.mock('../../../electron/main/renderer-broadcast', () => ({
  broadcastToRenderers: vi.fn(),
}))

import { buildCodexResponsesUrl, chatCodex, chatCodexWithTools } from '../../../electron/main/ai/providers/codex'

describe('buildCodexResponsesUrl', () => {
  it('自动补 /v1/responses', () => {
    expect(buildCodexResponsesUrl('https://api.openai.com')).toBe(
      'https://api.openai.com/v1/responses',
    )
    expect(buildCodexResponsesUrl('https://api.openai.com/v1')).toBe(
      'https://api.openai.com/v1/responses',
    )
  })
})

describe('chatCodex', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it('成功解析 Responses output', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        output: [
          {
            type: 'message',
            role: 'assistant',
            content: [{ type: 'output_text', text: 'hi' }],
          },
        ],
      }),
    })
    const res = await chatCodex(
      'https://api.openai.com/v1',
      'gpt-5.1-codex',
      'sk-x',
      [{ role: 'user', content: 'hello' }],
    )
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.text).toBe('hi')
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body))
    expect(body.store).toBe(false)
    expect(fetchMock.mock.calls[0][0]).toContain('/responses')
  })
})

describe('chatCodexWithTools', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it('解析 function_call', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        output: [
          {
            type: 'function_call',
            call_id: 'c1',
            name: 'Read',
            arguments: '{"file_path":"/tmp/a"}',
          },
        ],
      }),
    })
    const res = await chatCodexWithTools(
      'https://api.openai.com/v1',
      'gpt-5.1-codex',
      'sk-x',
      [{ role: 'user', content: 'read file' }],
      undefined,
      [{ name: 'Read', description: 'read', parameters: { type: 'object', properties: {} } }],
    )
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.toolCalls[0]?.name).toBe('Read')
      expect(res.toolCalls[0]?.arguments).toEqual({ file_path: '/tmp/a' })
    }
  })
})
