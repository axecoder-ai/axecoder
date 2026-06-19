import { describe, expect, it } from 'vitest'
import {
  agentLoopToOpenAiWire,
  aiChatToOpenAiWire,
  parseOpenAiAssistantParts,
} from '../../../electron/main/ai/openai-messages'

describe('parseOpenAiAssistantParts', () => {
  it('分离 content 与 reasoning_content', () => {
    const parts = parseOpenAiAssistantParts({
      content: '最终答案',
      reasoning_content: '思考过程',
    })
    expect(parts.content).toBe('最终答案')
    expect(parts.reasoningContent).toBe('思考过程')
    expect(parts.displayText).toBe('最终答案')
  })
})

describe('aiChatToOpenAiWire', () => {
  it('user 带 images 时 content 为多模态数组', () => {
    const wire = aiChatToOpenAiWire([
      {
        role: 'user',
        content: '图',
        images: [{ mimeType: 'image/png', data: 'abc' }],
      },
    ])
    expect(Array.isArray(wire[0].content)).toBe(true)
  })

  it('assistant 带 reasoningContent 时写入 reasoning_content', () => {
    const wire = aiChatToOpenAiWire([
      { role: 'user', content: 'hi' },
      {
        role: 'assistant',
        content: '',
        reasoningContent: 'chain',
      },
    ])
    expect(wire[1]).toEqual({
      role: 'assistant',
      content: '',
      reasoning_content: 'chain',
    })
  })
})

describe('agentLoopToOpenAiWire', () => {
  it('多轮 assistant 回传 reasoning_content 与 tool_calls', () => {
    const wire = agentLoopToOpenAiWire([
      { role: 'user', content: 'q' },
      {
        role: 'assistant',
        content: '',
        reasoningContent: 'think',
        toolCalls: [{ id: 'c1', name: 'Read', arguments: { file_path: '/a.md' } }],
      },
      { role: 'tool', toolCallId: 'c1', name: 'Read', content: 'ok' },
    ])
    expect(wire[1]).toMatchObject({
      role: 'assistant',
      content: '',
      reasoning_content: 'think',
    })
    expect(wire[1].tool_calls).toHaveLength(1)
    expect(wire[2]).toEqual({ role: 'tool', tool_call_id: 'c1', content: 'ok' })
  })

  it('仅最近一条 assistant 回传 reasoning_content', () => {
    const wire = agentLoopToOpenAiWire([
      { role: 'user', content: 'q' },
      { role: 'assistant', content: 'a1', reasoningContent: 'old think' },
      { role: 'user', content: 'q2' },
      { role: 'assistant', content: 'a2', reasoningContent: 'new think' },
    ])
    expect(wire[1]).toEqual({ role: 'assistant', content: 'a1' })
    expect(wire[3]).toEqual({
      role: 'assistant',
      content: 'a2',
      reasoning_content: 'new think',
    })
  })
})
