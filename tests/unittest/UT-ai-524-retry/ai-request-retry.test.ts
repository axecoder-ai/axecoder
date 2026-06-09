import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  AI_RATE_LIMIT_RETRY_DELAY_SEC_DEFAULT,
  AI_REQUEST_RETRY_DELAY_MS,
  clampAiRateLimitRetryDelaySec,
  clampAiRequestMaxRetries,
  fetchAiWithRetry,
  formatAiRequestFailedError,
  isRetryable429Status,
  isRetryable524Status,
  looksLikeRateLimitBody,
  resolveAiRetryKind,
} from '../../../electron/main/ai/ai-request-retry'

vi.mock('../../../electron/main/config-store', () => ({
  getConfig: vi.fn(async () => ({
    aiRequestMaxRetries: 2,
    aiRateLimitRetryDelaySec: 60,
  })),
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

  it('isRetryable429Status only matches 429', () => {
    expect(isRetryable429Status(429)).toBe(true)
    expect(isRetryable429Status(503)).toBe(false)
  })

  it('looksLikeRateLimitBody matches common rate-limit messages', () => {
    expect(looksLikeRateLimitBody('您已达到请求数限制：1分钟内最多请求55次。')).toBe(true)
    expect(looksLikeRateLimitBody('Too Many Requests')).toBe(true)
    expect(looksLikeRateLimitBody('internal error')).toBe(false)
  })

  it('resolveAiRetryKind detects rate limit in 403 body', () => {
    const body = '您已达到请求数限制：1分钟内最多请求55次。'
    expect(resolveAiRetryKind(403, body)).toBe('429')
    expect(resolveAiRetryKind(403, 'forbidden')).toBe(null)
  })

  it('clampAiRequestMaxRetries bounds 0-10', () => {
    expect(clampAiRequestMaxRetries(-1)).toBe(2)
    expect(clampAiRequestMaxRetries(5)).toBe(5)
    expect(clampAiRequestMaxRetries(99)).toBe(10)
  })

  it('clampAiRateLimitRetryDelaySec bounds 5-300', () => {
    expect(clampAiRateLimitRetryDelaySec(-1)).toBe(AI_RATE_LIMIT_RETRY_DELAY_SEC_DEFAULT)
    expect(clampAiRateLimitRetryDelaySec(90)).toBe(90)
    expect(clampAiRateLimitRetryDelaySec(999)).toBe(300)
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

  it('retries 429 until success', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('您已达到请求数限制：1分钟内最多请求55次。', { status: 429 }),
      )
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const p = fetchAiWithRetry('https://api.example.com/v1/chat', { method: 'POST' }, 1)
    await vi.advanceTimersByTimeAsync(60_000)
    const { res, meta } = await p

    expect(res.status).toBe(200)
    expect(meta).toEqual({ attempts: 2, maxRetries: 1 })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('retries 403 with rate-limit body until success', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('您已达到请求数限制：1分钟内最多请求55次。', { status: 403 }),
      )
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const p = fetchAiWithRetry('https://api.example.com/v1/chat', { method: 'POST' }, 1)
    await vi.advanceTimersByTimeAsync(60_000)
    const { res } = await p

    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('uses Retry-After header for 429 delay', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        new Response('rate limited', {
          status: 429,
          headers: { 'Retry-After': '15' },
        }),
      )
      .mockResolvedValueOnce(new Response('{"ok":true}', { status: 200 }))
    vi.stubGlobal('fetch', fetchMock)

    const p = fetchAiWithRetry('https://api.example.com/v1/chat', { method: 'POST' }, 1)
    await vi.advanceTimersByTimeAsync(15_000)
    const { res } = await p

    expect(res.status).toBe(200)
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('stops after max retries on persistent 524', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('timeout', { status: 524 }))
    vi.stubGlobal('fetch', fetchMock)

    const p = fetchAiWithRetry('https://api.example.com/v1/chat', { method: 'POST' }, 1)
    await vi.advanceTimersByTimeAsync(AI_REQUEST_RETRY_DELAY_MS)
    const { res, meta } = await p

    expect(res.status).toBe(524)
    expect(meta).toEqual({ attempts: 2, maxRetries: 1, lastRetryKind: '524' })
    expect(fetchMock).toHaveBeenCalledTimes(2)
  })

  it('does not retry non-retryable errors', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('bad', { status: 500 }))
    vi.stubGlobal('fetch', fetchMock)

    const { res, meta } = await fetchAiWithRetry('https://api.example.com/v1/chat', { method: 'POST' }, 2)

    expect(res.status).toBe(500)
    expect(meta).toEqual({ attempts: 1, maxRetries: 2 })
    expect(fetchMock).toHaveBeenCalledTimes(1)
  })

  it('formatAiRequestFailedError notes exhausted 524 retries', () => {
    const msg = formatAiRequestFailedError(524, '<html>cf</html>', {
      attempts: 3,
      maxRetries: 2,
      lastRetryKind: '524',
    })
    expect(msg).toContain('request failed (524)')
    expect(msg).toContain('[524 retried 2/2, still failed]')
  })

  it('formatAiRequestFailedError notes exhausted rate-limit retries', () => {
    const msg = formatAiRequestFailedError(429, '您已达到请求数限制', {
      attempts: 3,
      maxRetries: 2,
      lastRetryKind: '429',
    })
    expect(msg).toContain('request failed (429)')
    expect(msg).toContain('[rate limit retried 2/2, still failed]')
  })
})
