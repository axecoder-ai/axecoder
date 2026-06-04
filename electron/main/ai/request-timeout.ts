export const AI_REQUEST_TIMEOUT_MS = 30 * 60 * 1000

export const formatAiFetchError = (e: unknown) => {
  const name = e instanceof Error ? e.name : ''
  if (name === 'TimeoutError' || name === 'AbortError') {
    return 'Request timed out (30 min); check network or retry later'
  }
  return e instanceof Error ? e.message : 'Network error'
}
