const MAX_FETCH_CHARS = 200_000
const FETCH_TIMEOUT_MS = 30_000

const trimBody = (text: string) => {
  if (text.length <= MAX_FETCH_CHARS) return text
  return `${text.slice(0, MAX_FETCH_CHARS)}\n...[truncated]`
}

export const fetchUrl = async (url: string): Promise<{ ok: true; text: string } | { ok: false; error: string }> => {
  const u = url.trim()
  if (!u) return { ok: false, error: 'url is required' }
  if (!/^https?:\/\//i.test(u)) return { ok: false, error: 'url must start with http:// or https://' }
  try {
    const res = await fetch(u, {
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: { 'User-Agent': 'AxeCoder-Agent/1.0' },
    })
    if (!res.ok) return { ok: false, error: `HTTP ${res.status}: ${res.statusText}` }
    const text = trimBody(await res.text())
    return { ok: true, text }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export const webSearchStub = async (
  query: string,
  apiKey?: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> => {
  const q = query.trim()
  if (!q) return { ok: false, error: 'search_term is required' }
  if (!apiKey?.trim()) {
    return {
      ok: false,
      error:
        'WebSearch requires agentFeatureWebSearch and a search API key in AxeCoder config (agentWebSearchApiKey).',
    }
  }
  return {
    ok: false,
    error: 'WebSearch API provider not configured in this build. Use WebFetch with a known URL instead.',
  }
}
