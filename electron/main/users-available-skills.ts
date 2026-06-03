import { discoverCustomCommands } from './agent/agent-custom-commands'
import { listBuiltinCommands } from './agent/agent-builtin-commands'
import { discoverSkills } from './agent/agent-skills'
import type { AvailableSkillItem } from './users-types'

export const listAvailableSkills = async (projectRoot: string): Promise<AvailableSkillItem[]> => {
  const root = projectRoot.trim()
  const skills = await discoverSkills(root)
  const commands = await discoverCustomCommands(root)
  const builtinCommands = await listBuiltinCommands()
  const out: AvailableSkillItem[] = []
  const seen = new Set<string>()
  for (const s of skills) {
    const slug = s.name.toLowerCase()
    if (seen.has(slug)) continue
    seen.add(slug)
    out.push({ slug, label: s.name, kind: 'skill', source: s.source })
  }
  for (const c of commands) {
    const slug = c.name.toLowerCase()
    if (seen.has(slug)) continue
    seen.add(slug)
    out.push({ slug, label: c.description || c.name, kind: 'command', source: c.source })
  }
  for (const c of builtinCommands) {
    const slug = c.name.toLowerCase()
    if (seen.has(slug)) continue
    seen.add(slug)
    out.push({ slug, label: c.description || c.name, kind: 'command', source: 'builtin' })
  }
  return out.sort((a, b) => a.slug.localeCompare(b.slug))
}
