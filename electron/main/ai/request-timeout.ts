export const AI_REQUEST_TIMEOUT_MS = 30 * 60 * 1000

export const formatAiFetchError = (e: unknown) => {
  const name = e instanceof Error ? e.name : ''
  if (name === 'TimeoutError' || name === 'AbortError') {
    return '请求超时（30分钟），请检查网络或稍后重试'
  }
  return e instanceof Error ? e.message : '网络错误'
}
