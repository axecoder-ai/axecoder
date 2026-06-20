import fs from 'node:fs/promises'
import path from 'node:path'
import { descriptionFromMarkdown } from './agent-custom-commands'

export type DiscoveredBuiltinSkill = {
  name: string
  path: string
  source: 'builtin'
}

const appRoot = () =>
  process.env.APP_ROOT ?? path.resolve(import.meta.dirname, '../../..')

const builtinSkillsDir = () => path.join(appRoot(), 'resources/builtin-skills')

const mattpocockSkillsRoot = () => path.join(appRoot(), 'mattpocock-skills', 'skills')

const skillNameFromPath = (skillMd: string) => path.basename(path.dirname(skillMd))

type MattpocockBuiltinManifest = { skills?: string[] }

const loadMattpocockBuiltinManifest = async (): Promise<string[]> => {
  const manifestPath = path.join(appRoot(), 'resources/mattpocock-builtin-skills.json')
  try {
    const raw = await fs.readFile(manifestPath, 'utf-8')
    const parsed = JSON.parse(raw) as MattpocockBuiltinManifest
    return Array.isArray(parsed.skills) ? parsed.skills.filter((s) => typeof s === 'string') : []
  } catch {
    return []
  }
}

const discoverMattpocockBuiltinSkills = async (
  reserved: Set<string>,
): Promise<DiscoveredBuiltinSkill[]> => {
  const out: DiscoveredBuiltinSkill[] = []
  const relPaths = await loadMattpocockBuiltinManifest()
  for (const rel of relPaths) {
    const skillMd = path.join(mattpocockSkillsRoot(), rel, 'SKILL.md')
    const name = skillNameFromPath(skillMd).toLowerCase()
    if (reserved.has(name)) continue
    try {
      await fs.access(skillMd)
      reserved.add(name)
      out.push({ name: skillNameFromPath(skillMd), path: skillMd, source: 'builtin' })
    } catch {
      // manifest entry missing on disk
    }
  }
  return out
}

export type BuiltinSkillMeta = {
  name: string
  path: string
  description: string
}

export const discoverBuiltinSkills = async (): Promise<DiscoveredBuiltinSkill[]> => {
  const root = builtinSkillsDir()
  const reserved = new Set<string>()
  const out: DiscoveredBuiltinSkill[] = []
  let entries: { name: string; isDirectory: () => boolean }[] = []
  try {
    entries = await fs.readdir(root, { withFileTypes: true })
  } catch {
    // no resources/builtin-skills
  }
  for (const ent of entries) {
    if (!ent.isDirectory()) continue
    const skillMd = path.join(root, ent.name, 'SKILL.md')
    try {
      await fs.access(skillMd)
      const name = skillNameFromPath(skillMd)
      reserved.add(name.toLowerCase())
      out.push({ name, path: skillMd, source: 'builtin' })
    } catch {
      // not a skill folder
    }
  }
  out.push(...(await discoverMattpocockBuiltinSkills(reserved)))
  return out.sort((a, b) => a.name.localeCompare(b.name))
}

export const listBuiltinSkills = async (): Promise<BuiltinSkillMeta[]> => {
  const skills = await discoverBuiltinSkills()
  const out: BuiltinSkillMeta[] = []
  for (const s of skills) {
    let raw = ''
    try {
      raw = await fs.readFile(s.path, 'utf-8')
    } catch {
      continue
    }
    out.push({
      name: s.name,
      path: s.path,
      description: descriptionFromMarkdown(raw, `Built-in skill (${s.name})`),
    })
  }
  return out
}

export const findBuiltinSkillByName = async (name: string) => {
  const key = name.trim().toLowerCase()
  const skills = await discoverBuiltinSkills()
  return skills.find((s) => s.name.toLowerCase() === key) ?? null
}

export const loadBuiltinSkill = async (name: string) => {
  const skill = await findBuiltinSkillByName(name)
  if (!skill) return { ok: false as const, error: `Built-in skill not found: ${name}` }
  try {
    const text = (await fs.readFile(skill.path, 'utf-8')).trim()
    return { ok: true as const, name: skill.name, text, path: skill.path }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
  }
}
