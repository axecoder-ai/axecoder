import fs from 'node:fs/promises'
import path from 'node:path'
import { getAxecoderDir } from '../axecoder-dir'

const DOC_NAMES = ['AXECODER.md', 'AGENTS.md', 'CLAUDE.md'] as const
const LOCAL_NAMES = ['AXECODER.local.md', 'AGENTS.local.md', 'CLAUDE.local.md'] as const
const INDEX_FILE = 'MEMORY.md'
const MAX_IMPORT_DEPTH = 5

export type MemoryDocScope = 'user' | 'ancestor' | 'project' | 'local'

export type MemoryDocSource = {
  path: string
  scope: MemoryDocScope
  body: string
}

export type MemoryType = 'user' | 'feedback' | 'project' | 'reference'

export type SavedMemory = {
  name: string
  title?: string
  description: string
  type: MemoryType
  body: string
}

const slug = (raw: string): string =>
  raw
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64) || 'note'

const normalizeType = (raw: string): MemoryType => {
  const t = raw.trim().toLowerCase()
  if (t === 'user' || t === 'feedback' || t === 'project' || t === 'reference') return t
  return 'project'
}

const memoryStoreDir = (projectRoot: string) =>
  path.join(path.resolve(projectRoot), '.axecoder', 'memory')

const expandImports = async (filePath: string, depth = 0): Promise<string> => {
  let text: string
  try {
    text = await fs.readFile(filePath, 'utf-8')
  } catch {
    return ''
  }
  if (depth >= MAX_IMPORT_DEPTH) return text
  const dir = path.dirname(filePath)
  const lines: string[] = []
  for (const line of text.split('\n')) {
    const m = line.match(/^@(.+)$/)
    if (!m) {
      lines.push(line)
      continue
    }
    const ref = m[1].trim()
    const imported = path.isAbsolute(ref) ? ref : path.join(dir, ref)
    const body = (await expandImports(imported, depth + 1)).trim()
    if (body) lines.push(body)
  }
  return lines.join('\n')
}

const loadDocFiles = async (
  dir: string,
  names: readonly string[],
  scope: MemoryDocScope,
  seen: Set<string>,
): Promise<MemoryDocSource[]> => {
  const out: MemoryDocSource[] = []
  for (const name of names) {
    const filePath = path.join(dir, name)
    if (seen.has(filePath)) continue
    seen.add(filePath)
    const body = (await expandImports(filePath)).trim()
    if (!body) continue
    out.push({ path: filePath, scope, body })
  }
  return out
}

const memoryDirChain = (
  projectRoot: string,
): { dir: string; scope: MemoryDocScope }[] => {
  const root = path.resolve(projectRoot)
  const chain: { dir: string; scope: MemoryDocScope }[] = []
  const ancestors: string[] = []
  let cur = path.dirname(root)
  while (cur !== path.dirname(cur)) {
    ancestors.unshift(cur)
    cur = path.dirname(cur)
  }
  for (const dir of ancestors) chain.push({ dir, scope: 'ancestor' })
  chain.push({ dir: root, scope: 'project' })
  return chain
}

/** 分层文档记忆：user → 祖先目录 → 项目根 → local */
export const discoverMemoryDocs = async (projectRoot: string): Promise<MemoryDocSource[]> => {
  const root = path.resolve(projectRoot.trim())
  const seen = new Set<string>()
  const out: MemoryDocSource[] = []

  out.push(...(await loadDocFiles(getAxecoderDir(), DOC_NAMES, 'user', seen)))

  for (const { dir, scope } of memoryDirChain(root)) {
    out.push(...(await loadDocFiles(dir, DOC_NAMES, scope, seen)))
  }

  out.push(...(await loadDocFiles(root, LOCAL_NAMES, 'local', seen)))
  return out
}

export const loadMemoryIndex = async (projectRoot: string): Promise<string> => {
  const indexPath = path.join(memoryStoreDir(projectRoot), INDEX_FILE)
  try {
    return (await fs.readFile(indexPath, 'utf-8')).trim()
  } catch {
    return ''
  }
}

const renderMemoryFile = (m: SavedMemory, slugName: string): string => {
  const title = m.title?.trim() || slugName.replace(/-/g, ' ')
  const lines = [
    '---',
    `name: ${slugName}`,
    `title: ${title}`,
    `description: ${m.description}`,
    `type: ${m.type}`,
    '---',
    '',
    m.body.trim(),
    '',
  ]
  return lines.join('\n')
}

const parseIndexLines = (index: string): string[] =>
  index
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l.startsWith('- '))

const rebuildIndex = async (storeDir: string) => {
  let entries: string[] = []
  try {
    const files = await fs.readdir(storeDir)
    const slugs = files
      .filter((f) => f.endsWith('.md') && f !== INDEX_FILE)
      .map((f) => f.slice(0, -3))
      .sort()
    for (const name of slugs) {
      const raw = await fs.readFile(path.join(storeDir, `${name}.md`), 'utf-8')
      const desc =
        raw.match(/^description:\s*(.+)$/m)?.[1]?.trim() ||
        raw.match(/^title:\s*(.+)$/m)?.[1]?.trim() ||
        name
      entries.push(`- [[${name}]] — ${desc}`)
    }
  } catch {
    entries = []
  }
  const text = entries.length ? `# Saved memories\n\n${entries.join('\n')}\n` : ''
  if (text) await fs.writeFile(path.join(storeDir, INDEX_FILE), text, 'utf-8')
  else {
    try {
      await fs.unlink(path.join(storeDir, INDEX_FILE))
    } catch {
      /* no index yet */
    }
  }
  return text.trim()
}

export const saveMemory = async (
  projectRoot: string,
  input: SavedMemory,
): Promise<{ ok: true; path: string; name: string } | { ok: false; error: string }> => {
  const root = path.resolve(projectRoot.trim())
  if (!root) return { ok: false, error: 'No project root' }
  const name = slug(input.name || input.title || input.description)
  if (!name) return { ok: false, error: 'Memory needs a name or description' }
  if (!input.description?.trim() || !input.body?.trim()) {
    return { ok: false, error: 'description and body are required' }
  }
  const storeDir = memoryStoreDir(root)
  await fs.mkdir(storeDir, { recursive: true })
  const filePath = path.join(storeDir, `${name}.md`)
  await fs.writeFile(
    filePath,
    renderMemoryFile(
      {
        name,
        title: input.title,
        description: input.description.trim(),
        type: normalizeType(input.type),
        body: input.body,
      },
      name,
    ),
    'utf-8',
  )
  await rebuildIndex(storeDir)
  return { ok: true, path: filePath, name }
}

export const forgetMemory = async (
  projectRoot: string,
  nameArg: string,
): Promise<{ ok: true; name: string } | { ok: false; error: string }> => {
  const root = path.resolve(projectRoot.trim())
  const name = slug(nameArg)
  if (!name) return { ok: false, error: 'Memory name required' }
  const filePath = path.join(memoryStoreDir(root), `${name}.md`)
  try {
    await fs.unlink(filePath)
  } catch {
    return { ok: false, error: `Memory "${name}" not found` }
  }
  await rebuildIndex(memoryStoreDir(root))
  return { ok: true, name }
}

/** 注入 system prompt 的完整记忆块 */
export const composeMemoryPrompt = async (projectRoot: string): Promise<string | null> => {
  const docs = await discoverMemoryDocs(projectRoot)
  const index = await loadMemoryIndex(projectRoot)
  const blocks: string[] = []

  for (const doc of docs) {
    const label =
      doc.scope === 'user'
        ? `user (${doc.path})`
        : doc.scope === 'local'
          ? `local (${doc.path})`
          : doc.scope === 'ancestor'
            ? `ancestor (${doc.path})`
            : `project (${doc.path})`
    blocks.push(`## ${label}\n${doc.body}`)
  }

  if (index) {
    blocks.push(
      `## auto-memory index\nUse Read on \`.axecoder/memory/<name>.md\` to load a saved fact.\n\n${index}`,
    )
  }

  if (!blocks.length) return null
  return `# Project memory\n\n${blocks.join('\n\n')}`
}
