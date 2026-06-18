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

/** 闸门校验用：优先完整 report，再尝试 JSON 块 */
export const artifactBodyForGate = (
  summary: string,
  reasoningContent?: string,
  planSource?: string,
): string => {
  const full = (reasoningContent || planSource || summary).trim()
  const block = extractJsonBlock(full)
  if (block) return block
  return full || summary.trim()
}
