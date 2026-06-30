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

describe('long-session-compact-quality', () => {
  beforeEach(() => {
    vi.resetModules()
    vi.clearAllMocks()
  })

  const setupLlmMocks = async () => {
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
      text: 'Merged summary with path/foo.ts decision.',
      content: '',
    })
    return { chatWithProvider }
  }

  it('extractPriorCompactSummary 从 compact 占位消息提取摘要', async () => {
    const { extractPriorCompactSummary } = await import(
      '../../../electron/main/agent/agent-context-compact'
    )
    const messages: AgentLoopMessage[] = [
      {
        role: 'user',
        content:
          '<system-reminder>\nConversation compacted. Earlier summary:\nUser wanted foo.ts refactored.\n</system-reminder>',
      },
      { role: 'user', content: 'continue' },
    ]
    expect(extractPriorCompactSummary(messages)).toBe('User wanted foo.ts refactored.')
  })

  it('priorSummary 传入 LLM prompt', async () => {
    const { chatWithProvider } = await setupLlmMocks()
    const { compactAgentMessagesWithLlm } = await import(
      '../../../electron/main/agent/agent-context-compact'
    )
    const messages: AgentLoopMessage[] = [{ role: 'system', content: 'sys' }]
    for (let i = 0; i < 12; i++) {
      messages.push({ role: 'user', content: `msg ${i}` })
    }
    await compactAgentMessagesWithLlm(messages, 5, {
      modelId: 'm1',
      priorSummary: 'Earlier: edited bar.ts',
    })
    const userMsg = vi.mocked(chatWithProvider).mock.calls[0]?.[2]?.[1]?.content ?? ''
    expect(userMsg).toContain('Earlier: edited bar.ts')
    expect(userMsg).toContain('Previous conversation summary')
  })

  it('compact 前 tool 内容进入 serialize（大段 tool 被截断但非占位符）', async () => {
    const { serializeMessagesForCompact } = await import(
      '../../../electron/main/agent/agent-context-compact'
    )
    const toolBody = 'grep hit: src/main.ts line 42'
    const text = serializeMessagesForCompact([
      { role: 'tool', toolCallId: '1', name: 'Grep', content: toolBody },
    ])
    expect(text).toContain('src/main.ts')
    expect(text).not.toContain('Previous tool result cleared')
  })

  it('compactChatHistoryWithLlm 成功时 usedLlm 为 true', async () => {
    await setupLlmMocks()
    const { compactChatHistoryWithLlm } = await import('../../../electron/main/chat-compact')
    const messages = Array.from({ length: 25 }, (_, i) => ({
      role: 'user' as const,
      content: `chat ${i} file${i}.ts`,
    }))
    const result = await compactChatHistoryWithLlm(messages, 10, { modelId: 'm1' })
    expect(result.usedLlm).toBe(true)
    expect(result.summary).toContain('Merged summary')
    expect(result.messages.length).toBeLessThan(messages.length)
  })

  it('compactChatHistoryWithLlm 无 modelId 时规则回退', async () => {
    const { compactChatHistoryWithLlm } = await import('../../../electron/main/chat-compact')
    const messages = Array.from({ length: 25 }, (_, i) => ({
      role: 'user' as const,
      content: `chat ${i}`,
    }))
    const result = await compactChatHistoryWithLlm(messages, 10)
    expect(result.usedLlm).toBe(false)
    expect(result.summary).toContain('Removed')
  })
})
