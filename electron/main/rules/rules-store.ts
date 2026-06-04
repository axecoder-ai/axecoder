import fs from 'node:fs/promises'
import path from 'node:path'
import { app } from 'electron'
import { ensureAxecoderDir, axecoderPath } from '../axecoder-dir'
import type { RuleDetail, RuleListItem, RuleSaveInput, RulesListResult, RuleScope } from './rules-types'
import { parseRuleFile, ruleDisplayTitle, serializeRuleFile } from './rules-parse'

const userRulesDir = () => axecoderPath('rules')
const projectRulesDir = (projectRoot: string) =>
  path.join(path.resolve(projectRoot.trim()), '.cursor', 'rules')

const lastProjectFile = () => path.join(app.getPath('userData'), 'last-project.json')

export const readLastProjectRoot = async (): Promise<string | null> => {
  try {
    const raw = await fs.readFile(lastProjectFile(), 'utf-8')
    const data = JSON.parse(raw) as { rootPath?: string }
    const root = data?.rootPath?.trim()
    return root || null
  } catch {
    return null
  }
}

const ensureDir = async (dir: string) => {
  await fs.mkdir(dir, { recursive: true })
}

const safeFileName = (name: string): string => {
  const base = path.basename(name.trim())
  if (!base || base.includes('..') || base.includes('/') || base.includes('\\')) {
    throw new Error('Invalid rule file name')
  }
  return base.endsWith('.mdc') ? base : `${base}.mdc`
}

const slugify = (text: string): string => {
  const s = text
    .trim()
    .toLowerCase()
    .replace(/[^\w\u4e00-\u9fff]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)
  return s || 'rule'
}

const resolveRulesDir = (scope: RuleScope, projectRoot?: string): string => {
  if (scope === 'user') return userRulesDir()
  const root = projectRoot?.trim() || ''
  if (!root) throw new Error('Open a project first to edit project rules')
  return projectRulesDir(root)
}

const assertInsideDir = (dir: string, filePath: string) => {
  const resolvedDir = path.resolve(dir)
  const resolvedFile = path.resolve(filePath)
  if (!resolvedFile.startsWith(resolvedDir + path.sep) && resolvedFile !== resolvedDir) {
    throw new Error('Rule path escapes rules directory')
  }
}

const readRuleAtPath = async (
  scope: RuleScope,
  fileName: string,
  filePath: string,
): Promise<RuleListItem> => {
  const raw = await fs.readFile(filePath, 'utf-8')
  const { frontmatter, body } = parseRuleFile(raw)
  return {
    scope,
    fileName,
    description: ruleDisplayTitle(frontmatter, body, fileName),
    alwaysApply: frontmatter.alwaysApply === true,
    globs: frontmatter.globs,
  }
}

const listRulesInDir = async (scope: RuleScope, dir: string): Promise<RuleListItem[]> => {
  let entries: string[]
  try {
    entries = await fs.readdir(dir)
  } catch {
    return []
  }
  const items: RuleListItem[] = []
  for (const name of entries) {
    if (!name.endsWith('.mdc')) continue
    const filePath = path.join(dir, name)
    try {
      const st = await fs.stat(filePath)
      if (!st.isFile()) continue
      items.push(await readRuleAtPath(scope, name, filePath))
    } catch {
      /* skip broken */
    }
  }
  items.sort((a, b) => a.description.localeCompare(b.description, undefined, { sensitivity: 'base' }))
  return items
}

export const listRules = async (projectRoot?: string | null): Promise<RulesListResult> => {
  await ensureAxecoderDir()
  await ensureDir(userRulesDir())
  const root = projectRoot?.trim() || (await readLastProjectRoot())
  const userRules = await listRulesInDir('user', userRulesDir())
  let projectRules: RuleListItem[] = []
  if (root) {
    const dir = projectRulesDir(root)
    await ensureDir(dir)
    projectRules = await listRulesInDir('project', dir)
  }
  return {
    projectRoot: root,
    rules: [...userRules, ...projectRules],
  }
}

export const readRule = async (
  scope: RuleScope,
  fileName: string,
  projectRoot?: string,
): Promise<RuleDetail> => {
  const dir = resolveRulesDir(scope, projectRoot)
  const safe = safeFileName(fileName)
  const filePath = path.join(dir, safe)
  assertInsideDir(dir, filePath)
  const raw = await fs.readFile(filePath, 'utf-8')
  const { frontmatter, body } = parseRuleFile(raw)
  const item = await readRuleAtPath(scope, safe, filePath)
  return { ...item, body }
}

export const saveRule = async (input: RuleSaveInput): Promise<RulesListResult> => {
  await ensureAxecoderDir()
  const dir = resolveRulesDir(input.scope, input.projectRoot)
  await ensureDir(dir)

  let fileName: string
  if (input.isNew) {
    const base = slugify(input.description || 'rule')
    let candidate = `${base}.mdc`
    let n = 2
    while (true) {
      try {
        await fs.access(path.join(dir, candidate))
        candidate = `${base}-${n}.mdc`
        n += 1
      } catch {
        fileName = candidate
        break
      }
    }
  } else {
    fileName = safeFileName(input.fileName)
  }

  const filePath = path.join(dir, fileName)
  assertInsideDir(dir, filePath)
  const content = serializeRuleFile(
    {
      description: input.description.trim(),
      alwaysApply: input.alwaysApply,
      globs: input.globs?.trim() || undefined,
    },
    input.body,
  )
  await fs.writeFile(filePath, content, 'utf-8')
  return listRules(input.projectRoot ?? (await readLastProjectRoot()))
}

export const deleteRule = async (
  scope: RuleScope,
  fileName: string,
  projectRoot?: string,
): Promise<RulesListResult> => {
  const dir = resolveRulesDir(scope, projectRoot)
  const safe = safeFileName(fileName)
  const filePath = path.join(dir, safe)
  assertInsideDir(dir, filePath)
  await fs.unlink(filePath)
  return listRules(projectRoot ?? (await readLastProjectRoot()))
}

/** 合并 alwaysApply 规则，供 Agent system prompt 注入 */
export const loadAlwaysApplyRulesPrompt = async (projectRoot: string): Promise<string | null> => {
  const root = path.resolve(projectRoot.trim())
  let rules: RuleListItem[]
  try {
    rules = (await listRules(root)).rules
  } catch {
    return null
  }
  const always = rules.filter((r) => r.alwaysApply === true)
  if (!always.length) return null

  const blocks: string[] = []
  for (const rule of always) {
    try {
      const detail = await readRule(
        rule.scope,
        rule.fileName,
        rule.scope === 'project' ? root : undefined,
      )
      const name = detail.description || rule.fileName
      blocks.push(
        `<always_applied_workspace_rules name="${name.replace(/"/g, '\\"')}">\n${detail.body}\n</always_applied_workspace_rules>`,
      )
    } catch {
      /* skip */
    }
  }
  if (!blocks.length) return null
  return blocks.join('\n\n')
}
