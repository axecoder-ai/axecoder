import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { listBuiltinSkills } from '../agent/agent-builtin-skills'
import { readLastProjectRoot } from '../rules/rules-store'
import type { SkillDetail, SkillListItem, SkillSaveInput, SkillsListResult, SkillScope } from './skills-types'
import { parseSkillFile, serializeSkillFile, skillDisplayDescription } from './skills-parse'

let userSkillsDirOverride: string | null = null

export const setUserSkillsDirForTests = (dir: string | null) => {
  userSkillsDirOverride = dir
}

const userSkillsDir = () =>
  userSkillsDirOverride ?? path.join(os.homedir(), '.cursor', 'skills')

const projectSkillsDir = (projectRoot: string) =>
  path.join(path.resolve(projectRoot.trim()), '.cursor', 'skills')

const skillMdPath = (dir: string, folderName: string) =>
  path.join(dir, folderName, 'SKILL.md')

const safeFolderName = (name: string): string => {
  const base = path.basename(name.trim())
  if (!base || base.includes('..') || base.includes('/') || base.includes('\\')) {
    throw new Error('Invalid skill folder name')
  }
  if (!/^[a-zA-Z0-9_-]+$/.test(base)) {
    throw new Error('Skill folder name may only contain letters, numbers, _ and -')
  }
  return base
}

const slugify = (text: string): string => {
  const s = text
    .trim()
    .toLowerCase()
    .replace(/[^\w-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return s || 'skill'
}

const resolveSkillsDir = (scope: 'user' | 'project', projectRoot?: string): string => {
  if (scope === 'user') return userSkillsDir()
  const root = projectRoot?.trim() || ''
  if (!root) throw new Error('Open a project first to edit project skills')
  return projectSkillsDir(root)
}

const assertInsideDir = (dir: string, filePath: string) => {
  const resolvedDir = path.resolve(dir)
  const resolvedFile = path.resolve(filePath)
  if (!resolvedFile.startsWith(resolvedDir + path.sep) && resolvedFile !== resolvedDir) {
    throw new Error('Skill path escapes skills directory')
  }
}

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true })
}

const readSkillAtPath = async (
  scope: SkillScope,
  folderName: string,
  filePath: string,
  readOnly: boolean,
): Promise<SkillListItem> => {
  const raw = await fs.readFile(filePath, 'utf-8')
  const { frontmatter } = parseSkillFile(raw)
  const name = frontmatter.name?.trim() || folderName
  return {
    scope,
    folderName,
    name,
    description: skillDisplayDescription(frontmatter, folderName),
    readOnly,
  }
}

const listSkillsInDir = async (
  scope: 'user' | 'project',
  dir: string,
): Promise<SkillListItem[]> => {
  let entries: { name: string; isDirectory: () => boolean }[] = []
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
  const items: SkillListItem[] = []
  for (const ent of entries) {
    if (!ent.isDirectory()) continue
    const folderName = ent.name
    const filePath = skillMdPath(dir, folderName)
    try {
      const st = await fs.stat(filePath)
      if (!st.isFile()) continue
      items.push(await readSkillAtPath(scope, folderName, filePath, false))
    } catch {
      /* skip broken */
    }
  }
  items.sort((a, b) => a.description.localeCompare(b.description, undefined, { sensitivity: 'base' }))
  return items
}

const listBuiltinSkillItems = async (): Promise<SkillListItem[]> => {
  const builtins = await listBuiltinSkills()
  return builtins.map((s) => ({
    scope: 'builtin' as const,
    folderName: path.basename(path.dirname(s.path)),
    name: s.name,
    description: s.description,
    readOnly: true,
  }))
}

export const listSkills = async (projectRoot?: string | null): Promise<SkillsListResult> => {
  await ensureDir(userSkillsDir())
  const root = projectRoot?.trim() || (await readLastProjectRoot())
  const userSkills = await listSkillsInDir('user', userSkillsDir())
  let projectSkills: SkillListItem[] = []
  if (root) {
    const dir = projectSkillsDir(root)
    await ensureDir(dir)
    projectSkills = await listSkillsInDir('project', dir)
  }
  const builtins = await listBuiltinSkillItems()
  return {
    projectRoot: root,
    skills: [...userSkills, ...projectSkills, ...builtins],
  }
}

export const readSkill = async (
  scope: SkillScope,
  folderName: string,
  projectRoot?: string,
): Promise<SkillDetail> => {
  if (scope === 'builtin') {
    const builtins = await listBuiltinSkills()
    const hit = builtins.find(
      (s) => path.basename(path.dirname(s.path)) === folderName || s.name === folderName,
    )
    if (!hit) throw new Error('Built-in skill not found')
    const raw = await fs.readFile(hit.path, 'utf-8')
    const { frontmatter, body } = parseSkillFile(raw)
    const fn = path.basename(path.dirname(hit.path))
    return {
      scope: 'builtin',
      folderName: fn,
      name: frontmatter.name?.trim() || hit.name,
      description: skillDisplayDescription(frontmatter, fn),
      readOnly: true,
      body,
    }
  }

  const dir = resolveSkillsDir(scope, projectRoot)
  const safe = safeFolderName(folderName)
  const filePath = skillMdPath(dir, safe)
  assertInsideDir(dir, filePath)
  const raw = await fs.readFile(filePath, 'utf-8')
  const { body } = parseSkillFile(raw)
  const item = await readSkillAtPath(scope, safe, filePath, false)
  return { ...item, body }
}

export const saveSkill = async (input: SkillSaveInput): Promise<SkillsListResult> => {
  const name = input.name.trim()
  const description = input.description.trim()
  if (!name) throw new Error('Skill name is required')
  if (!description) throw new Error('Skill description is required')

  const dir = resolveSkillsDir(input.scope, input.projectRoot)
  await ensureDir(dir)

  let folderName: string
  if (input.isNew) {
    const base = slugify(name)
    let candidate = safeFolderName(base)
    let n = 2
    while (true) {
      try {
        await fs.access(skillMdPath(dir, candidate))
        candidate = safeFolderName(`${base}-${n}`)
        n += 1
      } catch {
        folderName = candidate
        break
      }
    }
  } else {
    folderName = safeFolderName(input.folderName)
  }

  const skillDir = path.join(dir, folderName)
  const filePath = skillMdPath(dir, folderName)
  assertInsideDir(dir, filePath)
  await ensureDir(skillDir)

  const content = serializeSkillFile({ name, description }, input.body)
  await fs.writeFile(filePath, content, 'utf-8')
  return listSkills(input.projectRoot ?? (await readLastProjectRoot()))
}

export const deleteSkill = async (
  scope: 'user' | 'project',
  folderName: string,
  projectRoot?: string,
): Promise<SkillsListResult> => {
  const dir = resolveSkillsDir(scope, projectRoot)
  const safe = safeFolderName(folderName)
  const skillDir = path.join(dir, safe)
  assertInsideDir(dir, skillDir)
  await fs.rm(skillDir, { recursive: true, force: true })
  return listSkills(projectRoot ?? (await readLastProjectRoot()))
}
