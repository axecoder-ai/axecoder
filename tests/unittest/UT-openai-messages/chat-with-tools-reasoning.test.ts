import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { chatOpenAiWithTools } from '../../../electron/main/ai/chat-with-tools'
import type { AgentLoopMessage } from '../../../electron/main/agent/agent-types'
import type { ModelEntry } from '../../../electron/main/models-types'

describe('chatOpenAiWithTools reasoning roundtrip', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    vi.stubGlobal('fetch', fetchMock)
  })

  afterEach(() => {
    vi.unstubAllGlobals()
    fetchMock.mockReset()
  })

  it('第二轮请求 body 含 reasoning_content', async () => {
    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: '',
                reasoning_content: 'step1 think',
                tool_calls: [
                  {
                    id: 'c1',
                    type: 'function',
                    function: { name: 'Read', arguments: '{"file_path":"a.md"}' },
                  },
                ],
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          choices: [{ message: { content: 'done', reasoning_content: 'step2' } }],
        }),
      })

    const model: ModelEntry = {
      id: '1',
      name: 'ds',
      provider: 'openai',
      modelId: 'deepseek-reasoner',
      baseUrl: 'https://api.deepseek.com/v1',
      enabled: true,
    }

    const messages: AgentLoopMessage[] = [
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'hi' },
    ]

    const first = await chatOpenAiWithTools(model, 'sk', messages)
    expect(first.ok).toBe(true)
    if (!first.ok) return

    messages.push({
      role: 'assistant',
      content: first.content,
      reasoningContent: first.reasoningContent,
      toolCalls: first.toolCalls,
    })
    messages.push({ role: 'tool', toolCallId: 'c1', name: 'Read', content: 'file body' })

    const second = await chatOpenAiWithTools(model, 'sk', messages)
    expect(second.ok).toBe(true)

    const secondBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body))
    const assistant = secondBody.messages.find((m: { role: string }) => m.role === 'assistant')
    expect(assistant.reasoning_content).toBe('step1 think')
  })
})
