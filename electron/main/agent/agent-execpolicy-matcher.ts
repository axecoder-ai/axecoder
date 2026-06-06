const HERESTRING_PLACEHOLDER = '\u0001HERESTRING\u0001'
const HEREDOC_RE = /<<-?\s*(?:['"]?)([A-Za-z_][A-Za-z0-9_]*)(?:['"]?)/g

/** 剥离 heredoc 正文，便于模式匹配 */
export const stripHeredocBodies = (command: string): string => {
  if (!command.includes('<<')) return command
  const owned = command.replace(/<<</g, HERESTRING_PLACEHOLDER)
  const lines = owned.split('\n')
  const out: string[] = []
  let i = 0
  while (i < lines.length) {
    const line = lines[i]!
    let delim: string | null = null
    let redacted = line
    HEREDOC_RE.lastIndex = 0
    let cap = HEREDOC_RE.exec(line)
    while (cap) {
      const whole = cap[0]
      redacted = redacted.replace(whole, '')
      delim = cap[1] ?? null
      cap = HEREDOC_RE.exec(line)
    }
    const cleaned = redacted.split(/\s+/).filter(Boolean).join(' ')
    out.push(cleaned)
    i++
    if (delim) {
      while (i < lines.length && lines[i]!.trim() !== delim) i++
      if (i < lines.length) i++
    }
  }
  return out.join('\n').replaceAll(HERESTRING_PLACEHOLDER, '<<<')
}

/** 简易 shell 分词：支持双引号内空格 */
const shellSplit = (input: string): string[] => {
  const tokens: string[] = []
  let cur = ''
  let inQuote = false
  for (let i = 0; i < input.length; i++) {
    const ch = input[i]!
    if (ch === '"') {
      inQuote = !inQuote
      continue
    }
    if (!inQuote && /\s/.test(ch)) {
      if (cur) tokens.push(cur)
      cur = ''
      continue
    }
    cur += ch
  }
  if (cur) tokens.push(cur)
  return tokens
}

export const normalizeCommand = (command: string): string => {
  const stripped = stripHeredocBodies(command)
  const tokens = shellSplit(stripped)
  if (tokens.length > 0) return tokens.join(' ')
  return stripped.split(/\s+/).filter(Boolean).join(' ')
}

/** 通配符模式匹配（* → .*） */
export const patternMatches = (pattern: string, command: string): boolean => {
  const p = normalizeCommand(pattern)
  const c = normalizeCommand(command)
  if (p === '*') return true
  const escaped = p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\\\*/g, '.*')
  try {
    return new RegExp(`^${escaped}$`).test(c)
  } catch {
    return false
  }
}
