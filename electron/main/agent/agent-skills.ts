import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'

export type DiscoveredSkill = {
  name: string
  path: string
  source: 'project' | 'user'
}

const skillNameFromPath = (skillMd: string) => {
  const dir = path.dirname(skillMd)
  return path.basename(dir)
}

const walkSkills = async (root: string, source: DiscoveredSkill['source'], out: DiscoveredSkill[]) => {
  let entries: { name: string; isDirectory: () => boolean }[] = []
  try {
    entries = await fs.readdir(root, { withFileTypes: true })
  } catch {
    return
  }
  for (const ent of entries) {
    if (!ent.isDirectory()) continue
    const skillDir = path.join(root, ent.name)
    const skillMd = path.join(skillDir, 'SKILL.md')
    try {
      await fs.access(skillMd)
      out.push({ name: skillNameFromPath(skillMd), path: skillMd, source })
    } catch {
      // not a skill folder
    }
  }
}

export const discoverSkills = async (projectRoot: string): Promise<DiscoveredSkill[]> => {
  const out: DiscoveredSkill[] = []
  await walkSkills(path.join(projectRoot, '.cursor', 'skills'), 'project', out)
  await walkSkills(path.join(os.homedir(), '.cursor', 'skills'), 'user', out)
  const seen = new Set<string>()
  return out.filter((s) => {
    const key = `${s.source}:${s.name}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

export const readSkillContent = async (skillPath: string) => {
  try {
    const text = await fs.readFile(skillPath, 'utf-8')
    return { ok: true as const, text }
  } catch (e) {
    return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
  }
}

export const findSkillByName = async (projectRoot: string, name: string) => {
  const skills = await discoverSkills(projectRoot)
  const trimmed = name.trim()
  return (
    skills.find((s) => s.name === trimmed) ??
    skills.find((s) => s.path.includes(trimmed)) ??
    null
  )
}
