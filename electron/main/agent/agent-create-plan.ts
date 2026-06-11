import fs from 'node:fs/promises'
import path from 'node:path'
import { loadBuiltinCommand } from './agent-builtin-commands'
import { relativeInProject } from './agent-path'

export type CreatePlanTodo = { id: string; content: string }

export type CreatePlanInput = {
  name: string
  overview: string
  plan: string
  todos?: CreatePlanTodo[]
  file_path?: string
}

/** 用户明确要求用 create_plan / 生成 plan 文件 */
export const userWantsCreatePlan = (input: string): boolean => {
  const t = input.trim()
  if (!t) return false
  return /create[_\s-]?plan|createplan|生成\s*plan|使用\s*create_plan|调用\s*create_plan|create_plan\s*工具/i.test(
    t,
  )
}

export const slugifyPlanName = (name: string): string => {
  const s = name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fff]+/gi, '-')
    .replace(/^-+|-+$/g, '')
  return s || 'plan'
}

export const defaultPlanRelPath = (slug: string) => `docs/plans/plan-${slug}.md`

export const isAxeCoderPlanFile = (filePath: string, content?: string): boolean => {
  const norm = filePath.replace(/\\/g, '/')
  if (/docs\/plans\/plan-[^/]+\.md$/i.test(norm)) return true
  if (content && /^---\s*\n[\s\S]*?axecoder-plan:\s*true/m.test(content)) return true
  return false
}

export const buildPlanMarkdown = (input: CreatePlanInput): string => {
  const todosBlock =
    input.todos?.length ?
      `\n## Todos\n\n${input.todos.map((t) => `- [ ] ${t.content}`).join('\n')}\n`
    : ''
  return `---
axecoder-plan: true
name: ${JSON.stringify(input.name)}
overview: ${JSON.stringify(input.overview)}
created: ${new Date().toISOString().slice(0, 10)}
---

# ${input.name}

${input.overview}

${input.plan.trim()}${todosBlock}
`
}

export const parseCreatePlanInput = (
  args: Record<string, unknown>,
): { ok: true; input: CreatePlanInput; relPath: string } | { ok: false; error: string } => {
  const name = typeof args.name === 'string' ? args.name.trim() : ''
  const overview = typeof args.overview === 'string' ? args.overview.trim() : ''
  const plan = typeof args.plan === 'string' ? args.plan : ''
  if (!name) return { ok: false, error: 'name is required' }
  if (!overview) return { ok: false, error: 'overview is required' }
  if (!plan.trim()) return { ok: false, error: 'plan is required' }

  const todosRaw = args.todos
  let todos: CreatePlanTodo[] | undefined
  if (Array.isArray(todosRaw)) {
    todos = todosRaw
      .map((t, i) => {
        if (!t || typeof t !== 'object') return null
        const row = t as Record<string, unknown>
        const content = typeof row.content === 'string' ? row.content.trim() : ''
        const id = typeof row.id === 'string' && row.id.trim() ? row.id.trim() : `todo-${i + 1}`
        if (!content) return null
        return { id, content }
      })
      .filter((t): t is CreatePlanTodo => t !== null)
    if (!todos.length) todos = undefined
  }

  const slug = slugifyPlanName(name)
  const filePathArg = typeof args.file_path === 'string' ? args.file_path.trim() : ''
  const relPath = filePathArg || defaultPlanRelPath(slug)

  return {
    ok: true,
    input: { name, overview, plan, todos, file_path: filePathArg || undefined },
    relPath: relPath.replace(/^[/\\]+/, ''),
  }
}

export const writePlanFile = async (
  projectRoot: string,
  relPath: string,
  markdown: string,
): Promise<{ ok: true; relPath: string } | { ok: false; error: string }> => {
  const abs = path.resolve(projectRoot, relPath)
  const root = path.resolve(projectRoot)
  if (!abs.startsWith(root + path.sep) && abs !== root) {
    return { ok: false, error: 'Plan path must be inside project' }
  }
  await fs.mkdir(path.dirname(abs), { recursive: true })
  await fs.writeFile(abs, markdown, 'utf8')
  return { ok: true, relPath }
}

export const composePlanBuildUserMessage = async (
  projectRoot: string,
  planRelPath: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> => {
  const loaded = await loadBuiltinCommand('implement')
  if (!loaded.ok) return { ok: false, error: loaded.error }
  const rel = relativeInProject(projectRoot, path.resolve(projectRoot, planRelPath)) ?? planRelPath
  let planBody = ''
  try {
    planBody = await fs.readFile(path.resolve(projectRoot, planRelPath), 'utf8')
  } catch {
    planBody = `(could not read plan file at ${rel})`
  }
  const text = `${loaded.text.trim()}

---

**Build this plan.** Implement according to the plan document below.

Plan file: \`${rel}\`

<plan-document>
${planBody}
</plan-document>`
  return { ok: true, text }
}
