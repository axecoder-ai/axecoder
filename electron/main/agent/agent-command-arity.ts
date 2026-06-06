import { BASH_ARITY_TABLE } from './agent-bash-arity-table'

const SORTED_ARITY = [...BASH_ARITY_TABLE].sort((a, b) => b[0].length - a[0].length)

/** 从 token 列表提取 arity-aware 规范前缀（对齐 DeepSeek-TUI classify_command） */
export const classifyCommand = (tokens: string[]): string => {
  if (tokens.length === 0) return ''
  const positional = tokens
    .filter((t) => !t.startsWith('-'))
    .map((t) => t.toLowerCase())
  if (positional.length === 0) return ''
  const maxDepth = Math.min(positional.length, 3)
  for (let depth = maxDepth; depth >= 1; depth--) {
    const candidate = positional.slice(0, depth).join(' ')
    const hit = SORTED_ARITY.find(([key]) => key === candidate)
    if (hit) {
      const take = Math.min(hit[1], positional.length)
      return positional.slice(0, take).join(' ')
    }
  }
  return positional[0] ?? ''
}

/** allow 规则 arity-aware 匹配 */
export const prefixAllowMatches = (pattern: string, command: string): boolean => {
  const patternNorm = pattern
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .join(' ')
  const tokens = command.split(/\s+/).filter(Boolean)
  if (tokens.length === 0) return patternNorm === ''
  const canonical = classifyCommand(tokens)
  if (canonical === patternNorm) return true
  const commandNorm = command
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean)
    .join(' ')
  return commandNorm === patternNorm || commandNorm.startsWith(`${patternNorm} `)
}
