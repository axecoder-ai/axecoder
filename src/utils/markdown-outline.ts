export type OutlineItem = {
  line: number
  level: number
  text: string
}

export const parseMarkdownOutline = (content: string): OutlineItem[] => {
  const items: OutlineItem[] = []
  const lines = content.split('\n')
  for (let i = 0; i < lines.length; i++) {
    const m = lines[i].match(/^(#{1,6})\s+(.+)$/)
    if (m) items.push({ line: i + 1, level: m[1].length, text: m[2].trim() })
  }
  return items
}
