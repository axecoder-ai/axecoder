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

export const webSearch = async (
  query: string,
  apiKey?: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> => {
  const q = query.trim()
  if (!q) return { ok: false, error: 'search_term is required' }
  if (!apiKey?.trim()) {
    return {
      ok: false,
      error:
        'WebSearch requires agentFeatureWebSearch and a search API key in Settings (Serper API key).',
    }
  }
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

/** @deprecated use webSearch */
export const webSearchStub = webSearch
