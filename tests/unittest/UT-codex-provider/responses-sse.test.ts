import { describe, expect, it } from 'vitest'
import {
  emptyResponsesStreamAccum,
  mergeResponsesStreamChunk,
  responsesStreamAccumToParts,
} from '../../../electron/main/ai/responses-sse'

describe('mergeResponsesStreamChunk', () => {
  it('累加 output_text 与 reasoning delta', () => {
    const accum = emptyResponsesStreamAccum()
    const a = mergeResponsesStreamChunk(accum, {
      type: 'response.output_text.delta',
      delta: '你',
    })
    expect(a.contentDelta).toBe('你')
    const b = mergeResponsesStreamChunk(accum, {
      type: 'response.reasoning_summary_text.delta',
      delta: '思',
    })
    expect(b.reasoningDelta).toBe('思')
    const parts = responsesStreamAccumToParts(accum)
    expect(parts.content).toBe('你')
    expect(parts.reasoningContent).toBe('思')
  })

  it('累加 function_call_arguments delta', () => {
    const accum = emptyResponsesStreamAccum()
    mergeResponsesStreamChunk(accum, {
      type: 'response.output_item.added',
      item: { type: 'function_call', call_id: 'c1', name: 'Read' },
    })
    mergeResponsesStreamChunk(accum, {
      type: 'response.function_call_arguments.delta',
      call_id: 'c1',
      delta: '{"file_path":',
    })
    mergeResponsesStreamChunk(accum, {
      type: 'response.function_call_arguments.delta',
      call_id: 'c1',
      delta: '"/a"}',
    })
    const parts = responsesStreamAccumToParts(accum)
    expect(parts.toolCalls[0]?.name).toBe('Read')
    expect(parts.toolCalls[0]?.arguments).toEqual({ file_path: '/a' })
  })
})
