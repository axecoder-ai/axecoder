import { describe, expect, it } from 'vitest'
import { pickOpenAiReplyText } from '../../../electron/main/ai/openai-reply'

describe('pickOpenAiReplyText', () => {
  it('优先 content', () => {
    expect(pickOpenAiReplyText({ content: 'hello' })).toBe('hello')
  })

  it('content 为空时用 reasoning_content', () => {
    expect(
      pickOpenAiReplyText({ content: '', reasoning_content: 'think then answer' }),
    ).toBe('think then answer')
  })

  it('数组 content 拼接 text', () => {
    expect(
      pickOpenAiReplyText({
        content: [{ type: 'text', text: 'part1' }, { type: 'text', text: 'part2' }],
      }),
    ).toBe('part1\npart2')
  })
})
