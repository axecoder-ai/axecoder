export type SubagentFrontmatter = {
  name?: string
  description?: string
  model?: string
  readonly?: boolean
  is_background?: boolean
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

const parseSimpleYaml = (yaml: string): Record<string, string> => {
  const out: Record<string, string> = {}
  for (const line of yaml.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf(':')
    if (idx < 1) continue
    const key = trimmed.slice(0, idx).trim()
    let val = trimmed.slice(idx + 1).trim()
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1)
    }
    out[key] = val
  }
  return out
}

const parseBool = (v: string | undefined): boolean => {
  if (!v) return false
  const s = v.trim().toLowerCase()
  return s === 'true' || s === 'yes' || s === '1'
}

export const parseSubagentFile = (
  content: string,
): { frontmatter: SubagentFrontmatter; body: string } => {
  const m = content.match(FRONTMATTER_RE)
  if (!m) {
    return { frontmatter: {}, body: content.trim() }
  }
  const raw = parseSimpleYaml(m[1])
  return {
    frontmatter: {
      name: raw.name?.trim() || undefined,
      description: raw.description?.trim() || undefined,
      model: raw.model?.trim() || undefined,
      readonly: parseBool(raw.readonly),
      is_background: parseBool(raw.is_background),
    },
    body: m[2].trim(),
  }
}

export const serializeSubagentFile = (
  frontmatter: SubagentFrontmatter,
  body: string,
): string => {
  const lines = ['---']
  const name = frontmatter.name?.trim()
  const desc = frontmatter.description?.trim()
  const model = frontmatter.model?.trim() || 'inherit'
  if (name) lines.push(`name: ${name}`)
  if (desc) lines.push(`description: ${JSON.stringify(desc)}`)
  lines.push(`model: ${model}`)
  if (frontmatter.readonly) lines.push('readonly: true')
  if (frontmatter.is_background) lines.push('is_background: true')
  lines.push('---', '')
  const text = body.trim()
  return text ? `${lines.join('\n')}${text}\n` : `${lines.join('\n')}\n`
}

export const subagentDisplayDescription = (
  frontmatter: SubagentFrontmatter,
  fileStem: string,
): string => {
  if (frontmatter.description?.trim()) return frontmatter.description.trim()
  if (frontmatter.name?.trim()) return frontmatter.name.trim()
  return fileStem
}
