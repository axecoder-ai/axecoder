import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../../../electron/main/models-store', () => ({
  getModelById: vi.fn(),
}))
vi.mock('../../../electron/main/secrets-store', () => ({
  getSecret: vi.fn(async () => 'sk-test'),
}))
vi.mock('../../../electron/main/ai/chat-with-provider', () => ({
  chatWithProvider: vi.fn(),
}))
vi.mock('../../../electron/main/ai/api-model-resolve', () => ({
  resolveApiModelIdForTask: vi.fn(async () => 'fast-model'),
}))

import {
  buildTitlePrompt,
  isPlaceholderSessionTitle,
  parseSuggestedTitle,
  shouldSuggestSessionTitle,
  suggestChatSessionTitle,
  truncateSessionTitle,
} from '../../../electron/main/session/session-title'
import { getModelById } from '../../../electron/main/models-store'
import { chatWithProvider } from '../../../electron/main/ai/chat-with-provider'

const msgs = (
  pairs: [role: 'user' | 'assistant', text: string][],
): { role: 'user' | 'assistant'; text: string }[] =>
  pairs.map(([role, text]) => ({ role, text }))

describe('session-title helpers', () => {
  it('truncateSessionTitle 超长加省略号', () => {
    expect(truncateSessionTitle('a'.repeat(30))).toBe(`${'a'.repeat(24)}…`)
  })

  it('isPlaceholder 识别默认与首句', () => {
    expect(isPlaceholderSessionTitle('New Agent', '你好')).toBe(true)
    expect(isPlaceholderSessionTitle('你好', '你好')).toBe(true)
    expect(isPlaceholderSessionTitle(truncateSessionTitle('调整支付模块'), '调整支付模块')).toBe(true)
    expect(isPlaceholderSessionTitle('支付系统优先级梳理', '你好')).toBe(false)
  })

  it('isPlaceholder 识别协作模式占位标题', () => {
    expect(isPlaceholderSessionTitle('Draw.IO', 'JXS 系统架构')).toBe(true)
    expect(isPlaceholderSessionTitle('Multi-Agent', '梳理模块')).toBe(true)
    expect(isPlaceholderSessionTitle('Software Co.', '写 PRD')).toBe(true)
  })

  it('shouldSuggest 至少四轮且仍为占位', () => {
    const dialog = msgs([
      ['user', '你好'],
      ['assistant', '你好，有什么可以帮你？'],
      ['user', '梳理支付模块优先级'],
      ['assistant', '好的，这是优先级表…'],
    ])
    expect(shouldSuggestSessionTitle(dialog, '你好')).toBe(true)
    expect(shouldSuggestSessionTitle(dialog.slice(0, 2), '你好')).toBe(false)
    expect(shouldSuggestSessionTitle(dialog, '支付模块优先级')).toBe(false)
  })

  it('parseSuggestedTitle strips quotes and prefixes', () => {
    expect(parseSuggestedTitle('"Payment system priority"')).toBe('Payment system priority')
    expect(parseSuggestedTitle('Topic: refund flow redesign')).toBe('refund flow redesign')
  })

  it('buildTitlePrompt 包含最近对话', () => {
    const p = buildTitlePrompt(msgs([['user', '模块 A'], ['assistant', '说明 B']]))
    expect(p).toContain('user: 模块 A')
    expect(p).toContain('assistant: 说明 B')
  })
})

describe('suggestChatSessionTitle', () => {
  beforeEach(() => {
    vi.mocked(getModelById).mockReset()
    vi.mocked(chatWithProvider).mockReset()
  })

  it('消息不足时不调 LLM', async () => {
    const res = await suggestChatSessionTitle('m1', msgs([['user', '你好']]), 'New Agent')
    expect(res.ok).toBe(false)
    expect(chatWithProvider).not.toHaveBeenCalled()
  })

  it('成功生成并返回主题', async () => {
    vi.mocked(getModelById).mockResolvedValue({
      id: 'm1',
      name: 'test',
      provider: 'openai',
      baseUrl: 'http://x',
      modelId: 'gpt',
      enabled: true,
    } as never)
    vi.mocked(chatWithProvider).mockResolvedValue({
      ok: true,
      content: '支付模块优先级梳理',
    } as never)
    const dialog = msgs([
      ['user', '你好'],
      ['assistant', '在的'],
      ['user', '帮我排支付模块优先级'],
      ['assistant', '表格如下…'],
    ])
    const res = await suggestChatSessionTitle('m1', dialog, '你好')
    expect(res).toEqual({ ok: true, title: '支付模块优先级梳理' })
    expect(chatWithProvider).toHaveBeenCalled()
  })
})
