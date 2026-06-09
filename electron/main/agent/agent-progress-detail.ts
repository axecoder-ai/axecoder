import type { AgentToolCall } from './agent-types'

const MAX_DETAIL_CHARS = 4000

export const truncateProgressDetail = (text: string, max = MAX_DETAIL_CHARS): string => {
  const s = text.trim()
  if (s.length <= max) return s
  return `${s.slice(0, max)}\n… (${s.length - max} more chars)`
}

export const formatModelCallDetail = (res: {
  text: string
  content: string
  reasoningContent?: string
  toolCalls: AgentToolCall[]
}): string => {
  const parts: string[] = []
  const reasoning = res.reasoningContent?.trim()
  if (reasoning) parts.push(`── reasoning ──\n${truncateProgressDetail(reasoning)}`)
  const content = (res.content || res.text || '').trim()
  if (content) parts.push(`── content ──\n${truncateProgressDetail(content)}`)
  if (res.toolCalls.length) {
    const lines = res.toolCalls.map((tc) => {
      const args = JSON.stringify(tc.arguments ?? {})
      return `${tc.name} ${args}`
    })
    parts.push(`── tool_calls ──\n${lines.join('\n')}`)
  }
  return parts.join('\n\n').trim() || '(empty model response)'
}

export const formatToolResultDetail = (content: string): string =>
  truncateProgressDetail(content.trim() || '(empty tool result)')
