import { describe, expect, it } from 'vitest'
import {
  emptyOpenAiStreamAccum,
  mergeOpenAiStreamChunk,
  openAiStreamAccumToMessage,
} from '../../../electron/main/ai/openai-sse'

describe('mergeOpenAiStreamChunk', () => {
  it('累加 content 与 reasoning', () => {
    const accum = emptyOpenAiStreamAccum()
    const a = mergeOpenAiStreamChunk(accum, {
      choices: [{ delta: { content: '你' } }],
    })
    expect(a.contentDelta).toBe('你')
    const b = mergeOpenAiStreamChunk(accum, {
      choices: [{ delta: { content: '好', reasoning_content: '思' } }],
    })
    expect(b.contentDelta).toBe('好')
    expect(b.reasoningDelta).toBe('思')
    const msg = openAiStreamAccumToMessage(accum)
    expect(msg.content).toBe('你好')
    expect(msg.reasoning_content).toBe('思')
  })

  it('累加 tool_calls 分片', () => {
    const accum = emptyOpenAiStreamAccum()
    mergeOpenAiStreamChunk(accum, {
      choices: [
        {
          delta: {
            tool_calls: [{ index: 0, id: 'c1', function: { name: 'Read', arguments: '{"' } }],
          },
        },
      ],
    })
    mergeOpenAiStreamChunk(accum, {
      choices: [{ delta: { tool_calls: [{ index: 0, function: { arguments: 'file_path":"a"}' } }] } }],
    })
    const msg = openAiStreamAccumToMessage(accum)
    const calls = msg.tool_calls as { function: { name: string; arguments: string } }[]
    expect(calls[0].function.name).toBe('Read')
    expect(calls[0].function.arguments).toContain('file_path')
  })
})
