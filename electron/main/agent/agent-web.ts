const MAX_FETCH_CHARS = 200_000
const FETCH_TIMEOUT_MS = 30_000
const SERPER_URL = 'https://google.serper.dev/search'
const MAX_SEARCH_RESULTS = 10

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

type SerperOrganic = { title?: string; link?: string; snippet?: string }

/** Settings Key 优先，否则 SERPER_API_KEY */
export const resolveWebSearchApiKey = (cfg?: { agentWebSearchApiKey?: string }): string => {
  const fromConfig = cfg?.agentWebSearchApiKey?.trim()
  if (fromConfig) return fromConfig
  return process.env.SERPER_API_KEY?.trim() ?? ''
}

export const formatSerperResults = (data: { organic?: SerperOrganic[]; answerBox?: { answer?: string } }) => {
  const lines: string[] = []
  if (data.answerBox?.answer) {
    lines.push(`Answer: ${data.answerBox.answer}`, '')
  }
  const organic = data.organic ?? []
  if (!organic.length) {
    lines.push('No results found.')
    return lines.join('\n')
  }
  organic.slice(0, MAX_SEARCH_RESULTS).forEach((item, i) => {
    lines.push(`${i + 1}. ${item.title ?? '(no title)'}`)
    if (item.link) lines.push(`   ${item.link}`)
    if (item.snippet) lines.push(`   ${item.snippet}`)
    lines.push('')
  })
  return trimBody(lines.join('\n').trim())
}

export const webSearchSerper = async (
  query: string,
  apiKey: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> => {
  const q = query.trim()
  if (!q) return { ok: false, error: 'search_term is required' }
  if (!apiKey.trim()) return { ok: false, error: 'Serper API key is required' }
  try {
    const res = await fetch(SERPER_URL, {
      method: 'POST',
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
      headers: {
        'X-API-KEY': apiKey.trim(),
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ q, num: MAX_SEARCH_RESULTS }),
    })
    if (!res.ok) {
      const errText = trimBody(await res.text().catch(() => ''))
      return { ok: false, error: `Serper HTTP ${res.status}: ${errText || res.statusText}` }
    }
    const data = (await res.json()) as { organic?: SerperOrganic[]; answerBox?: { answer?: string } }
    return { ok: true, text: formatSerperResults(data) }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

export type WebSearchOpts = {
  apiKey?: string
  browserEnabled?: boolean
}

/** 有 Serper Key 走云端；否则在 browserEnabled 时走本机 Playwright */
export const webSearch = async (
  query: string,
  opts: WebSearchOpts = {},
): Promise<{ ok: true; text: string } | { ok: false; error: string }> => {
  const q = query.trim()
  if (!q) return { ok: false, error: 'search_term is required' }
  const key = opts.apiKey?.trim()
  if (key) {
    const cloud = await webSearchSerper(q, key)
    if (cloud.ok) return cloud
    if (opts.browserEnabled) {
      const { runBrowserSearch } = await import('./agent-browser-playwright')
      const local = await runBrowserSearch(q)
      if (local.ok) return local
    }
    return cloud
  }
  if (opts.browserEnabled) {
    const { runBrowserSearch } = await import('./agent-browser-playwright')
    return runBrowserSearch(q)
  }
  return {
    ok: false,
    error:
      'WebSearch unavailable: enable browser in Settings, or set a Serper API key / SERPER_API_KEY.',
  }
}

/** @deprecated use webSearch */
export const webSearchStub = webSearch
