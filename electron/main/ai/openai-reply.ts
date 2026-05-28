/** 从 OpenAI 兼容响应里取出助手正文（含 reasoning 等扩展字段） */
export const pickOpenAiReplyText = (message: Record<string, unknown> | undefined): string => {
  if (!message) return ''

  const content = message.content
  if (typeof content === 'string' && content.trim()) return content

  const reasoning = message.reasoning_content
  if (typeof reasoning === 'string' && reasoning.trim()) return reasoning

  if (Array.isArray(content)) {
    const parts: string[] = []
    for (const part of content) {
      if (part && typeof part === 'object' && 'text' in part) {
        const t = (part as { text?: string }).text
        if (typeof t === 'string' && t.trim()) parts.push(t)
      }
    }
    if (parts.length) return parts.join('\n')
  }

  return ''
}
