import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../../../electron/main/models-store', () => ({
  getModelById: vi.fn(),
}))
vi.mock('../../../electron/main/secrets-store', () => ({
  getSecret: vi.fn(),
}))
vi.mock('../../../electron/main/ai/chat-with-provider', () => ({
  chatWithProvider: vi.fn(),
}))

describe('buildLlmRoleSpeaker', () => {
  beforeEach(() => {
    vi.resetModules()
  })

  it('调用 chatWithProvider 并解析 JSON 摘要', async () => {
    const { getModelById } = await import('../../../electron/main/models-store')
    const { getSecret } = await import('../../../electron/main/secrets-store')
    const { chatWithProvider } = await import('../../../electron/main/ai/chat-with-provider')
    vi.mocked(getModelById).mockResolvedValue({
      id: 'm1',
      enabled: true,
      provider: 'openai',
      baseUrl: 'https://api.example.com',
      modelId: 'gpt',
    } as never)
    vi.mocked(getSecret).mockResolvedValue('key')
    vi.mocked(chatWithProvider).mockResolvedValue({
      ok: true,
      text: '{"summary":"结论","needsUser":false,"relatedFiles":["src/a.ts"]}',
      content: '',
    })
    const { buildLlmRoleSpeaker } = await import('../../../electron/main/workshop/workshop-llm')
    const deltas: string[] = []
    const speaker = buildLlmRoleSpeaker('m1', 'ws-1', () => undefined, (_s, d) => deltas.push(d))
    const out = await speaker({
      roleId: 'manager',
      userBrief: '任务',
      priorSummary: '',
    })
    expect(out.summary).toBe('结论')
    expect(out.relatedFiles).toEqual(['src/a.ts'])
    expect(chatWithProvider).toHaveBeenCalled()
    const onDelta = vi.mocked(chatWithProvider).mock.calls[0]?.[3]
    expect(onDelta).toBeTypeOf('function')
    onDelta?.({ content: '流' })
    expect(deltas.length).toBe(1)
  })
})
