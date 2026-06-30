import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { CC_BUILTIN_SUBAGENT_TYPES, getSubagentTypeConfig } from '../agent/agent-subagent-types'
import { readLastProjectRoot } from '../rules/rules-store'
import type {
  SubagentDetail,
  SubagentListItem,
  SubagentSaveInput,
  SubagentsListResult,
  SubagentScope,
} from './subagents-types'
import {
  parseSubagentFile,
  serializeSubagentFile,
  subagentDisplayDescription,
} from './subagents-parse'

let userSubagentsDirOverride: string | null = null

export const setUserSubagentsDirForTests = (dir: string | null) => {
  userSubagentsDirOverride = dir
}

const userSubagentsDir = () =>
  userSubagentsDirOverride ?? path.join(os.homedir(), '.cursor', 'agents')

const projectSubagentsDir = (projectRoot: string) =>
  path.join(path.resolve(projectRoot.trim()), '.cursor', 'agents')

const safeFileStem = (name: string): string => {
  const base = path.basename(name.trim())
  if (!base || base.includes('..') || base.includes('/') || base.includes('\\')) {
    throw new Error('Invalid subagent file name')
  }
  const stem = base.endsWith('.md') ? base.slice(0, -3) : base
  if (!stem || !/^[a-zA-Z0-9_-]+$/.test(stem)) {
    throw new Error('Subagent name may only contain letters, numbers, _ and -')
  }
  return stem
}

const slugify = (text: string): string => {
  const s = text
    .trim()
    .toLowerCase()
    .replace(/[^\w-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return s || 'subagent'
}

const resolveSubagentsDir = (scope: 'user' | 'project', projectRoot?: string): string => {
  if (scope === 'user') return userSubagentsDir()
  const root = projectRoot?.trim() || ''
  if (!root) throw new Error('Open a project first to edit project subagents')
  return projectSubagentsDir(root)
}

const assertInsideDir = (dir: string, filePath: string) => {
  const resolvedDir = path.resolve(dir)
  const resolvedFile = path.resolve(filePath)
  if (!resolvedFile.startsWith(resolvedDir + path.sep) && resolvedFile !== resolvedDir) {
    throw new Error('Subagent path escapes agents directory')
  }
}

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true })
}

const readSubagentAtPath = async (
  scope: SubagentScope,
  fileName: string,
  filePath: string,
  readOnly: boolean,
): Promise<SubagentListItem> => {
  const raw = await fs.readFile(filePath, 'utf-8')
  const { frontmatter } = parseSubagentFile(raw)
  const stem = fileName.endsWith('.md') ? fileName.slice(0, -3) : fileName
  const name = frontmatter.name?.trim() || stem
  return {
    scope,
    fileName: fileName.endsWith('.md') ? fileName : `${fileName}.md`,
    name,
    description: subagentDisplayDescription(frontmatter, stem),
    readOnly,
    model: frontmatter.model?.trim() || 'inherit',
    isBackground: frontmatter.is_background === true,
  }
}

const listSubagentsInDir = async (
  scope: 'user' | 'project',
  dir: string,
): Promise<SubagentListItem[]> => {
  let entries: { name: string; isFile: () => boolean }[] = []
  try {
    entries = await fs.readdir(dir, { withFileTypes: true })
  } catch {
    return []
  }
  const items: SubagentListItem[] = []
  for (const ent of entries) {
    if (!ent.isFile() || !ent.name.endsWith('.md')) continue
    const filePath = path.join(dir, ent.name)
    try {
      items.push(await readSubagentAtPath(scope, ent.name, filePath, false))
    } catch {
      /* skip broken */
    }
  }
  items.sort((a, b) => a.name.localeCompare(b.name, undefined, { sensitivity: 'base' }))
  return items
}

const listBuiltinSubagentItems = (): SubagentListItem[] =>
  CC_BUILTIN_SUBAGENT_TYPES.map((t) => {
    const cfg = getSubagentTypeConfig(t)
    return {
      scope: 'builtin' as const,
      fileName: `${t}.md`,
      name: t,
      description: cfg.promptPrefix.split('\n')[0]?.slice(0, 120) || t,
      readOnly: cfg.readOnly,
      model: 'inherit',
      isBackground: false,
    }
  })

export const listSubagents = async (projectRoot?: string | null): Promise<SubagentsListResult> => {
  const root = projectRoot?.trim() || (await readLastProjectRoot())
  const builtins = listBuiltinSubagentItems()
  const userItems = await listSubagentsInDir('user', userSubagentsDir())
  let projectItems: SubagentListItem[] = []
  if (root) {
    projectItems = await listSubagentsInDir('project', projectSubagentsDir(root))
  }
  const byName = new Map<string, SubagentListItem>()
  for (const b of builtins) byName.set(b.name.toLowerCase(), b)
  for (const u of userItems) byName.set(u.name.toLowerCase(), u)
  for (const p of projectItems) byName.set(p.name.toLowerCase(), p)
  const subagents = [...byName.values()].sort((a, b) => {
    const order = (s: SubagentScope) => (s === 'builtin' ? 0 : s === 'user' ? 1 : 2)
    const d = order(a.scope) - order(b.scope)
    if (d !== 0) return d
    return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
  })
  return { subagents, projectRoot: root || null }
}

export const readSubagent = async (
  scope: SubagentScope,
  fileName: string,
  projectRoot?: string,
): Promise<SubagentDetail> => {
  if (scope === 'builtin') {
    const stem = safeFileStem(fileName)
    const cfg = getSubagentTypeConfig(stem)
    return {
      scope: 'builtin',
      fileName: `${stem}.md`,
      name: stem,
      description: cfg.promptPrefix.split('\n')[0] || stem,
      readOnly: true,
      model: 'inherit',
      isBackground: false,
      body: cfg.promptPrefix,
    }
  }
  const dir = resolveSubagentsDir(scope, projectRoot)
  const stem = safeFileStem(fileName)
  const mdName = `${stem}.md`
  const filePath = path.join(dir, mdName)
  assertInsideDir(dir, filePath)
  const raw = await fs.readFile(filePath, 'utf-8')
  const { frontmatter, body } = parseSubagentFile(raw)
  const item = await readSubagentAtPath(scope, mdName, filePath, false)
  return {
    ...item,
    name: frontmatter.name?.trim() || item.name,
    description: subagentDisplayDescription(frontmatter, stem),
    readOnly: frontmatter.readonly === true,
    model: frontmatter.model?.trim() || 'inherit',
    isBackground: frontmatter.is_background === true,
    body,
  }
}

export const saveSubagent = async (input: SubagentSaveInput): Promise<SubagentsListResult> => {
  const dir = resolveSubagentsDir(input.scope, input.projectRoot)
  await ensureDir(dir)
  const name = input.name.trim()
  const desc = input.description.trim()
  if (!name) throw new Error('Subagent name is required')
  if (!desc) throw new Error('Subagent description is required')
  let stem = input.isNew ? slugify(name) : safeFileStem(input.fileName || name)
  if (input.isNew) {
    let candidate = stem
    let n = 1
    while (true) {
      try {
        await fs.access(path.join(dir, `${candidate}.md`))
        candidate = `${stem}-${n++}`
      } catch {
        stem = candidate
        break
      }
    }
  }
  const mdName = `${stem}.md`
  const filePath = path.join(dir, mdName)
  assertInsideDir(dir, filePath)
  const content = serializeSubagentFile(
    {
      name,
      description: desc,
      model: input.model?.trim() || 'inherit',
      readonly: input.readOnly,
      is_background: input.isBackground,
    },
    input.body,
  )
  await fs.writeFile(filePath, content, 'utf-8')
  return listSubagents(input.projectRoot ?? (await readLastProjectRoot()))
}

export const deleteSubagent = async (
  scope: 'user' | 'project',
  fileName: string,
  projectRoot?: string,
): Promise<SubagentsListResult> => {
  const dir = resolveSubagentsDir(scope, projectRoot)
  const stem = safeFileStem(fileName)
  const filePath = path.join(dir, `${stem}.md`)
  assertInsideDir(dir, filePath)
  await fs.unlink(filePath)
  return listSubagents(projectRoot ?? (await readLastProjectRoot()))
}

/** 运行时：按名称查找自定义 subagent（user 再 project，自定义覆盖内置） */
export const findCustomSubagentByName = async (
  projectRoot: string,
  rawName: string,
): Promise<SubagentDetail | null> => {
  const key = rawName.trim().toLowerCase()
  if (!key) return null
  const userDir = userSubagentsDir()
  const userItems = await listSubagentsInDir('user', userDir)
  const hitUser = userItems.find((s) => s.name.toLowerCase() === key)
  if (hitUser) {
    return readSubagent('user', hitUser.fileName)
  }
  const root = projectRoot.trim()
  if (root) {
    const projectItems = await listSubagentsInDir('project', projectSubagentsDir(root))
    const hitProject = projectItems.find((s) => s.name.toLowerCase() === key)
    if (hitProject) {
      return readSubagent('project', hitProject.fileName, root)
    }
  }
  return null
}

export const listCustomSubagentFileNames = async (projectRoot: string): Promise<string[]> => {
  const names = new Set<string>()
  const userItems = await listSubagentsInDir('user', userSubagentsDir())
  for (const s of userItems) names.add(s.name)
  const root = projectRoot.trim()
  if (root) {
    const projectItems = await listSubagentsInDir('project', projectSubagentsDir(root))
    for (const s of projectItems) names.add(s.name)
  }
  return [...names].sort((a, b) => a.localeCompare(b))
}

export const userAgentsDir = () => userSubagentsDir()
export const projectAgentsDir = (projectRoot: string) => projectSubagentsDir(projectRoot)
