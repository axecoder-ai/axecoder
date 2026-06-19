export type SopDesign = {
  title: string
  fileList: string[]
  dataStructures?: string[]
  apis?: { name: string; description: string }[]
  /** MetaGPT 式时序/交互说明（mermaid 或文字） */
  sequenceDiagram?: string
}

export const parseDesignJson = (
  raw: string,
): { ok: true; design: SopDesign } | { ok: false; error: string } => {
  try {
    const data = JSON.parse(raw) as SopDesign
    if (!data || typeof data.title !== 'string') {
      return { ok: false, error: 'Design missing title' }
    }
    if (!Array.isArray(data.fileList) || data.fileList.length === 0) {
      return { ok: false, error: 'Design fileList must be non-empty' }
    }
    return { ok: true, design: data }
  } catch {
    return { ok: false, error: 'Design invalid JSON' }
  }
}

export const designToMarkdown = (design: SopDesign): string => {
  const lines = [
    `# ${design.title}`,
    '',
    '## File List',
    ...design.fileList.map((f) => `- ${f}`),
  ]
  if (design.dataStructures?.length) {
    lines.push('', '## Data Structures', ...design.dataStructures.map((d) => `- ${d}`))
  }
  if (design.apis?.length) {
    lines.push('', '## APIs', ...design.apis.map((a) => `- **${a.name}**: ${a.description}`))
  }
  if (design.sequenceDiagram?.trim()) {
    lines.push('', '## Sequence', design.sequenceDiagram.trim())
  }
  return lines.join('\n')
}
