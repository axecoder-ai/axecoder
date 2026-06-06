/** Quick Open 模糊匹配：子序列 + 路径段权重 */

export const fuzzyScore = (query: string, filePath: string): number => {
  const q = query.trim().toLowerCase()
  const p = filePath.toLowerCase()
  if (!q) return 0
  if (p === q) return 2000
  const base = p.split(/[/\\]/).pop() || p
  if (base === q) return 1800
  if (base.startsWith(q)) return 1500 - base.length
  if (p.includes(q)) return 1200 - p.length

  let qi = 0
  let score = 0
  let last = -1
  for (let i = 0; i < p.length && qi < q.length; i++) {
    if (p[i] === q[qi]) {
      score += 10
      if (last >= 0 && i === last + 1) score += 8
      if (p[i - 1] === '/' || p[i - 1] === '\\' || i === 0) score += 6
      last = i
      qi++
    }
  }
  if (qi < q.length) return -1
  if (base.includes(q)) score += 40
  return score - p.length * 0.1
}

export const fuzzyFilterPaths = (query: string, paths: string[], limit = 50): string[] => {
  const q = query.trim()
  if (!q) return paths.slice(0, limit)
  const scored: { path: string; score: number }[] = []
  for (const p of paths) {
    const score = fuzzyScore(q, p)
    if (score >= 0) scored.push({ path: p, score })
  }
  scored.sort((a, b) => b.score - a.score || a.path.localeCompare(b.path))
  return scored.slice(0, limit).map((s) => s.path)
}
