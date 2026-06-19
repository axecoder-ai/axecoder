/** 从模型回复中提取 ```json 代码块 */
export const extractJsonBlock = (raw: string): string | null => {
  const m = raw.match(/```(?:json)?\s*([\s\S]*?)```/i)
  return m?.[1]?.trim() || null
}

/** 从澄清类回复中提取最后一个问句 */
export const extractClarifyQuestion = (text: string): string | null => {
  const raw = text.trim()
  if (!raw) return null
  const lines = raw.split(/\n/).map((l) => l.trim()).filter(Boolean)
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i]!
    if (/[?？]$/.test(line) && line.length >= 4 && line.length <= 400) return line
  }
  const inline = raw.match(/[^。！\n]{4,200}[?？]/g)
  if (inline?.length) return inline[inline.length - 1]!.trim()
  return null
}

/** 闸门校验用：仅当 ```json 块可解析为对象时才优先用块，否则保留全文供 markdown 闸门 */
export const artifactBodyForGate = (
  summary: string,
  reasoningContent?: string,
  planSource?: string,
): string => {
  const full = (reasoningContent || planSource || summary).trim()
  const block = extractJsonBlock(full)
  if (block) {
    try {
      const data = JSON.parse(block) as unknown
      if (data && typeof data === 'object' && !Array.isArray(data)) return block
    } catch {
      /* 无效 JSON 块：保留全文（含系统设计 markdown 等） */
    }
  }
  return full || summary.trim()
}
