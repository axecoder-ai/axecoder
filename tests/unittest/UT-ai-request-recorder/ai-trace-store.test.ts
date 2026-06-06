import { describe, expect, it, beforeEach, vi } from 'vitest'

vi.mock('../../../electron/main/renderer-broadcast', () => ({
  broadcastToRenderers: () => {},
}))
import {
  clearAiTraceEvents,
  getAiTraceState,
  resetAiTraceStore,
  sanitizeForTrace,
  setAiTraceRecording,
  traceModelCall,
  traceToolCall,
  traceToolResult,
} from '../../../electron/main/ai-trace-store'

describe('ai-trace-store', () => {
  beforeEach(() => {
    resetAiTraceStore()
  })

  it('redacts api keys and image base64 only', () => {
    const out = sanitizeForTrace({
      apiKey: 'secret',
      images: [{ mimeType: 'image/png', data: 'x'.repeat(500) }],
    }) as Record<string, unknown>
    expect(out.apiKey).toBe('[redacted]')
    const imgs = out.images as { summary: string; data?: string }[]
    expect(imgs[0]?.summary).toContain('omitted')
    expect(imgs[0]?.data).toBeUndefined()
  })

  it('does not truncate long text', () => {
    const long = 'y'.repeat(20_000)
    setAiTraceRecording(true)
    traceToolResult({ sessionId: 's1', turn: 1, toolName: 'Read', ok: true, content: long })
    const ev = getAiTraceState().events[0]
    expect(ev?.response).toContain(long)
    expect(ev?.response).not.toContain('[truncated]')
  })

  it('records only while recording', () => {
    traceModelCall({
      source: 'chat',
      modelId: 'm1',
      modelName: 'Test',
      provider: 'openai',
      requestMessages: [{ role: 'user', content: 'hi' }],
      result: { ok: true, text: 'ok' },
      durationMs: 10,
    })
    expect(getAiTraceState().eventCount).toBe(0)

    setAiTraceRecording(true)
    traceModelCall({
      source: 'chat',
      modelId: 'm1',
      modelName: 'Test',
      provider: 'openai',
      requestMessages: [{ role: 'user', content: 'hi' }],
      result: { ok: true, text: 'ok' },
      durationMs: 10,
    })
    expect(getAiTraceState().eventCount).toBe(1)

    traceToolCall({ sessionId: 's1', turn: 1, toolName: 'Read', args: { path: 'a.ts' } })
    traceToolResult({ sessionId: 's1', turn: 1, toolName: 'Read', ok: true, content: 'file' })
    expect(getAiTraceState().eventCount).toBe(3)

    clearAiTraceEvents()
    expect(getAiTraceState().eventCount).toBe(0)
  })
})
