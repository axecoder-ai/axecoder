/** @ 引用 token：@ 后连续非空白字符 */
const REF_TOKEN_RE = /@([^\s]+)/g

export const parseAtRefTokens = (line: string): string[] => {
  const out: string[] = []
  const seen = new Set<string>()
  for (const m of line.matchAll(REF_TOKEN_RE)) {
    const raw = m[1] ?? ''
    const t = raw.replace(/[.,;!?)\]}]+$/, '')
    if (!t || seen.has(t)) continue
    seen.add(t)
    out.push(t)
  }
  return out
}

/** 输入框内 @ 补全：取光标前最后一个 @ 起的 token */
export const activeAtRefToken = (
  text: string,
  cursor: number,
): { prefix: string; token: string; start: number } | null => {
  const before = text.slice(0, Math.max(0, cursor))
  const at = before.lastIndexOf('@')
  if (at < 0) return null
  if (at > 0 && !/\s/.test(before[at - 1]!)) return null
  const token = before.slice(at + 1)
  if (/\s/.test(token)) return null
  return { prefix: before.slice(0, at), token, start: at }
}
