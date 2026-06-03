import { describe, expect, it } from 'vitest'
import {
  anyMessageHasImages,
  userMessageToAnthropicContent,
  userMessageToOpenAiContent,
} from '../../../electron/main/ai/ai-message-images'

describe('userMessageToOpenAiContent', () => {
  it('无图时返回纯文本', () => {
    expect(userMessageToOpenAiContent('hello')).toBe('hello')
  })

  it('有图时返回 content 数组', () => {
    const parts = userMessageToOpenAiContent('看这张图', [
      { mimeType: 'image/png', data: 'abc' },
    ])
    expect(Array.isArray(parts)).toBe(true)
    const arr = parts as Record<string, unknown>[]
    expect(arr[0]).toEqual({ type: 'text', text: '看这张图' })
    expect(arr[1]).toMatchObject({
      type: 'image_url',
      image_url: { url: 'data:image/png;base64,abc' },
    })
  })
})

describe('userMessageToAnthropicContent', () => {
  it('有图时含 image block', () => {
    const blocks = userMessageToAnthropicContent('', [
      { mimeType: 'image/jpeg', data: 'xyz' },
    ]) as Record<string, unknown>[]
    expect(blocks.some((b) => b.type === 'image')).toBe(true)
  })
})

describe('anyMessageHasImages', () => {
  it('检测 user 消息中的图片', () => {
    expect(
      anyMessageHasImages([{ role: 'user', content: 'x', images: [{ mimeType: 'image/png', data: 'a' }] }]),
    ).toBe(true)
    expect(anyMessageHasImages([{ role: 'user', content: 'x' }])).toBe(false)
  })
})
