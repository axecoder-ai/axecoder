import { getConfig } from '../config-store'

export const AI_REQUEST_MAX_RETRIES_DEFAULT = 2
export const AI_REQUEST_RETRY_DELAY_MS = 2000

export const isRetryable524Status = (status: number) => status === 524

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms))

export const clampAiRequestMaxRetries = (n: unknown): number => {
  const v = typeof n === 'number' ? n : AI_REQUEST_MAX_RETRIES_DEFAULT
  if (!Number.isFinite(v) || v < 0) return AI_REQUEST_MAX_RETRIES_DEFAULT
  return Math.min(Math.floor(v), 10)
}

export const resolveAiRequestMaxRetries = async (): Promise<number> => {
  const cfg = await getConfig()
  return clampAiRequestMaxRetries(cfg.aiRequestMaxRetries)
}

export type AiFetchRetryMeta = { attempts: number; maxRetries: number }

export const formatAiRequestFailedError = (
  status: number,
  errText: string,
  meta?: AiFetchRetryMeta,
): string => {
  const body = errText.slice(0, 300)
  let msg = `request failed (${status}): ${body}`
  if (status === 524 && meta && meta.attempts > 1) {
    msg += ` [524 retried ${meta.attempts - 1}/${meta.maxRetries}, still failed]`
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
  for (let attempt = 0; attempt <= limit; attempt++) {
    const res = await fetch(url, init)
    if (!isRetryable524Status(res.status)) {
      return { res, meta: { attempts: attempt + 1, maxRetries: limit } }
    }
    lastRes = res
    if (attempt >= limit) break
    await sleep(AI_REQUEST_RETRY_DELAY_MS)
  }
  return { res: lastRes!, meta: { attempts: limit + 1, maxRetries: limit } }
}
