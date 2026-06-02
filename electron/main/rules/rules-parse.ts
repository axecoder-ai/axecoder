export type RuleFrontmatter = {
  description?: string
  alwaysApply?: boolean
  globs?: string
}

const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/

const parseSimpleYaml = (yaml: string): Record<string, string | boolean> => {
  const out: Record<string, string | boolean> = {}
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
    if (val === 'true') out[key] = true
    else if (val === 'false') out[key] = false
    else out[key] = val
  }
  return out
}

export const parseRuleFile = (
  content: string,
): { frontmatter: RuleFrontmatter; body: string } => {
  const m = content.match(FRONTMATTER_RE)
  if (!m) {
    return { frontmatter: {}, body: content.trim() }
  }
  const raw = parseSimpleYaml(m[1])
  const frontmatter: RuleFrontmatter = {
    description: typeof raw.description === 'string' ? raw.description : undefined,
    alwaysApply: raw.alwaysApply === true,
    globs: typeof raw.globs === 'string' ? raw.globs : undefined,
  }
  return { frontmatter, body: m[2].trim() }
}

export const serializeRuleFile = (frontmatter: RuleFrontmatter, body: string): string => {
  const lines = ['---']
  if (frontmatter.description?.trim()) {
    lines.push(`description: ${frontmatter.description.trim()}`)
  }
  if (frontmatter.alwaysApply) {
    lines.push('alwaysApply: true')
  }
  if (frontmatter.globs?.trim()) {
    lines.push(`globs: ${frontmatter.globs.trim()}`)
  }
  lines.push('---', '')
  const text = body.trim()
  return text ? `${lines.join('\n')}${text}\n` : `${lines.join('\n')}\n`
}

export const ruleDisplayTitle = (
  frontmatter: RuleFrontmatter,
  body: string,
  fileName: string,
): string => {
  if (frontmatter.description?.trim()) return frontmatter.description.trim()
  const first = body
    .split('\n')
    .map((l) => l.replace(/^#+\s*/, '').trim())
    .find((l) => l.length > 0)
  if (first) return first.slice(0, 120)
  return fileName.replace(/\.mdc$/i, '')
}
