import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AI_REQUEST_RETRY_DELAY_MS,
  clampAiRequestMaxRetries,
  fetchAiWithRetry,
  formatAiRequestFailedError,
  isRetryable524Status,
} from '../../../electron/main/ai/ai-request-retry'

vi.mock('../../../electron/main/config-store', () => ({
  getConfig: vi.fn(async () => ({ aiRequestMaxRetries: 2 })),
}))

describe('ai-request-retry', () => {
  beforeEach(() => {
    vi.useFakeTimers()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.unstubAllGlobals()
    vi.clearAllMocks()
  })

  it('isRetryable524Status only matches 524', () => {
    expect(isRetryable524Status(524)).toBe(true)
    expect(isRetryable524Status(502)).toBe(false)
  })

  it('clampAiRequestMaxRetries bounds 0-10', () => {
    expect(clampAiRequestMaxRetries(-1)).toBe(2)
    expect(clampAiRequestMaxRetries(5)).toBe(5)
    expect(clampAiRequestMaxRetries(99)).toBe(10)
  })

  it('retries 524 until success', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(new Response('timeout', { status: 524 }))
      .mockResolvedValueOnce(new Response('timeout', { status: 524 }))
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const p = fetchAiWithRetry('https://api.example.com/v1/chat', { method: 'POST' }, 2)
    await vi.advanceTimersByTimeAsync(AI_REQUEST_RETRY_DELAY_MS)
    await vi.advanceTimersByTimeAsync(AI_REQUEST_RETRY_DELAY_MS)
    const { res, meta } = await p

    expect(res.status).toBe(200)
    expect(meta).toEqual({ attempts: 3, maxRetries: 2 })
    expect(fetchMock).toHaveBeenCalledTimes(3)
  })

  it('stops after max retries on persistent 524', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('timeout', { status: 524 }))
    vi.stubGlobal('fetch', fetchMock)

    const p = fetchAiWithRetry('https://api.example.com/v1/chat', { method: 'POST' }, 1)
    await vi.advanceTimersByTimeAsync(AI_REQUEST_RETRY_DELAY_MS)
    const { res, meta } = await p

    expect(res.status).toBe(524)
    expect(meta).toEqual({ attempts: 2, maxRetries: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not retry non-524 errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('bad', { status: 500 }))
    vi.stubGlobal('fetch', fetchMock)

    const { res, meta } = await fetchAiWithRetry('https://api.example.com/v1/chat', { method: 'POST' }, 2)

    expect(res.status).toBe(500)
    expect(meta).toEqual({ attempts: 1, maxRetries: 2 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('formatAiRequestFailedError notes exhausted 524 retries', () => {
    const msg = formatAiRequestFailedError(524, '<html>cf</html>', { attempts: 3, maxRetries: 2 })
    expect(msg).toContain('request failed (524)')
    expect(msg).toContain('[524 retried 2/2, still failed]')
  })
})
