import { getConfig } from '../config-store'

export const AI_REQUEST_MAX_RETRIES_DEFAULT = 2
export const AI_REQUEST_RETRY_DELAY_MS = 2000
export const AI_RATE_LIMIT_RETRY_DELAY_SEC_DEFAULT = 60

export const isRetryable524Status = (status: number) => status === 524
export const isRetryable429Status = (status: number) => status === 429

export const looksLikeRateLimitBody = (text: string) =>
  /请求数限制|rate.?limit|too many requests/i.test(text)

export type AiRetryKind = '524' | '429'

export const resolveAiRetryKind = (status: number, bodyText?: string): AiRetryKind | null => {
  if (isRetryable524Status(status)) return '524'
  if (isRetryable429Status(status)) return '429'
  if (
    bodyText &&
    looksLikeRateLimitBody(bodyText) &&
    (status === 400 || status === 403 || status === 503)
  ) {
    return '429'
  }
  return null
}

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export const clampAiRequestMaxRetries = (n: unknown): number => {
  const v = typeof n === 'number' ? n : AI_REQUEST_MAX_RETRIES_DEFAULT
  if (!Number.isFinite(v) || v < 0) return AI_REQUEST_MAX_RETRIES_DEFAULT
  return Math.min(Math.floor(v), 10)
}

export const clampAiRateLimitRetryDelaySec = (n: unknown): number => {
  const v = typeof n === 'number' ? n : AI_RATE_LIMIT_RETRY_DELAY_SEC_DEFAULT
  if (!Number.isFinite(v) || v < 5) return AI_RATE_LIMIT_RETRY_DELAY_SEC_DEFAULT
  return Math.min(Math.floor(v), 300)
}

export const resolveAiRequestMaxRetries = async (): Promise<number> => {
  const cfg = await getConfig()
  return clampAiRequestMaxRetries(cfg.aiRequestMaxRetries)
}

export const resolveAiRateLimitRetryDelayMs = async (res?: Response): Promise<number> => {
  const retryAfter = res?.headers.get('retry-after')?.trim()
  if (retryAfter) {
    const sec = Number(retryAfter)
    if (Number.isFinite(sec) && sec > 0) return Math.min(Math.ceil(sec * 1000), 300_000)
    const dateMs = Date.parse(retryAfter)
    if (Number.isFinite(dateMs)) {
      const wait = dateMs - Date.now()
      if (wait > 0) return Math.min(wait, 300_000)
    }
  }
  const cfg = await getConfig()
  return clampAiRateLimitRetryDelaySec(cfg.aiRateLimitRetryDelaySec) * 1000
}

export type AiFetchRetryMeta = {
  attempts: number
  maxRetries: number
  lastRetryKind?: AiRetryKind
}

export const formatAiRequestFailedError = (
  status: number,
  errText: string,
  meta?: AiFetchRetryMeta,
): string => {
  const body = errText.slice(0, 300)
  let msg = `request failed (${status}): ${body}`
  if (meta && meta.attempts > 1 && meta.lastRetryKind) {
    const retried = meta.attempts - 1
    if (meta.lastRetryKind === '524') {
      msg += ` [524 retried ${retried}/${meta.maxRetries}, still failed]`
    } else {
      msg += ` [rate limit retried ${retried}/${meta.maxRetries}, still failed]`
    }
  }
  return msg
}

export const fetchAiWithRetry = async (
  url: string | URL,
  init: RequestInit,
  maxRetries?: number,
): Promise<{ res: Response; meta: AiFetchRetryMeta }> => {
  const limit = maxRetries ?? (await resolveAiRequestMaxRetries())
  let lastRes: Response | undefined
  let lastKind: AiRetryKind | undefined
  for (let attempt = 0; attempt <= limit; attempt++) {
    const res = await fetch(url, init)
    let bodyText = ''
    const kind = resolveAiRetryKind(res.status)
    if (!kind && (res.status === 400 || res.status === 403 || res.status === 503)) {
      try {
        bodyText = await res.clone().text()
      } catch {
        bodyText = ''
      }
    }
    const retryKind = kind ?? resolveAiRetryKind(res.status, bodyText)
    if (!retryKind) {
      return { res, meta: { attempts: attempt + 1, maxRetries: limit } }
    }
    lastRes = res
    lastKind = retryKind
    if (attempt >= limit) break
    const delayMs =
      retryKind === '524'
        ? AI_REQUEST_RETRY_DELAY_MS
        : await resolveAiRateLimitRetryDelayMs(res)
    await sleep(delayMs)
  }
  return {
    res: lastRes!,
    meta: { attempts: limit + 1, maxRetries: limit, lastRetryKind: lastKind },
  }
}
