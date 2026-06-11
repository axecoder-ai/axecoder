import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { AgentLoopMessage } from '../../../electron/main/agent/agent-types'

vi.mock('../../../electron/main/models-store', () => ({
  getModelById: vi.fn(),
}))
vi.mock('../../../electron/main/secrets-store', () => ({
  getSecret: vi.fn(),
}))
vi.mock('../../../electron/main/config-store', () => ({
  getConfig: vi.fn(),
}))
vi.mock('../../../electron/main/ai/chat-with-provider', () => ({
  chatWithProvider: vi.fn(),
}))

describe('llm-compact', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  const manyMessages = (): AgentLoopMessage[] => {
    const messages: AgentLoopMessage[] = [{ role: 'system', content: 'sys' }]
    for (let i = 0; i < 30; i++) {
      messages.push({ role: 'user', content: `message ${i} path/to/file${i}.ts` })
    }
    return messages
  }

  it('LLM 摘要成功时 usedLlm 为 true 且摘要写入占位', async () => {
    const { getModelById } = await import('../../../electron/main/models-store')
    const { getSecret } = await import('../../../electron/main/secrets-store')
    const { getConfig } = await import('../../../electron/main/config-store')
    const { chatWithProvider } = await import('../../../electron/main/ai/chat-with-provider')
    vi.mocked(getModelById).mockResolvedValue({
      id: 'm1',
      enabled: true,
      provider: 'openai',
      baseUrl: 'https://api.example.com',
      modelId: 'gpt',
    } as never)
    vi.mocked(getSecret).mockResolvedValue('key')
    vi.mocked(getConfig).mockResolvedValue({
      schemaVersion: 1,
      agentModelTierRoutingEnabled: true,
    } as never)
    vi.mocked(chatWithProvider).mockResolvedValue({
      ok: true,
      text: 'User asked to refactor agent-context-compact.ts and add LLM summary.',
      content: '',
    })
    const { compactAgentMessagesWithLlm } = await import(
      '../../../electron/main/agent/agent-context-compact'
    )
    const result = await compactAgentMessagesWithLlm(manyMessages(), 5, { modelId: 'm1', sessionId: 's1' })
    expect(result.usedLlm).toBe(true)
    expect(result.summary).toContain('LLM summary')
    expect(result.messages.some((m) => m.content?.includes('refactor agent-context-compact'))).toBe(true)
    expect(chatWithProvider).toHaveBeenCalled()
  })

  it('LLM 失败时回退规则摘要', async () => {
    const { getModelById } = await import('../../../electron/main/models-store')
    const { getSecret } = await import('../../../electron/main/secrets-store')
    const { getConfig } = await import('../../../electron/main/config-store')
    const { chatWithProvider } = await import('../../../electron/main/ai/chat-with-provider')
    vi.mocked(getModelById).mockResolvedValue({
      id: 'm1',
      enabled: true,
      provider: 'openai',
      baseUrl: 'https://api.example.com',
      modelId: 'gpt',
    } as never)
    vi.mocked(getSecret).mockResolvedValue('key')
    vi.mocked(getConfig).mockResolvedValue({
      schemaVersion: 1,
      agentModelTierRoutingEnabled: true,
    } as never)
    vi.mocked(chatWithProvider).mockResolvedValue({ ok: false, error: 'rate limit' })
    const { compactAgentMessagesWithLlm } = await import(
      '../../../electron/main/agent/agent-context-compact'
    )
    const result = await compactAgentMessagesWithLlm(manyMessages(), 5, { modelId: 'm1' })
    expect(result.usedLlm).toBe(false)
    expect(result.summary).toContain('Dropped')
  })

  it('serializeMessagesForCompact 截断过长 tool 内容', async () => {
    const { serializeMessagesForCompact } = await import(
      '../../../electron/main/agent/agent-context-compact'
    )
    const text = serializeMessagesForCompact([
      { role: 'tool', toolCallId: '1', name: 'Read', content: 'x'.repeat(5000) },
    ])
    expect(text.length).toBeLessThan(5000)
    expect(text).toContain('…')
  })
})
