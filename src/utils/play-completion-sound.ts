let cachedDataUrl: string | null = null
let cachedPathKey = ''

export const clearCompletionSoundCache = () => {
  cachedDataUrl = null
  cachedPathKey = ''
}

const loadDataUrl = async (pathKey: string): Promise<string | null> => {
  if (pathKey && pathKey === cachedPathKey && cachedDataUrl) return cachedDataUrl
  const res = await window.axecoder.getCompletionSoundDataUrl()
  if (!res.ok || !res.dataUrl) return null
  cachedDataUrl = res.dataUrl
  cachedPathKey = pathKey
  return res.dataUrl
}

/** Play on Agent completion when enabled and audio selected */
export const playAgentCompletionSound = async (opts: {
  enabled?: boolean
  path?: string
}) => {
  if (!opts.enabled) return
  const pathKey = opts.path?.trim() ?? ''
  if (!pathKey) return
  const url = await loadDataUrl(pathKey)
  if (!url) return
  const audio = new Audio(url)
  try {
    await audio.play()
  } catch {
    /* Ignore autoplay blocked */
  }
}
