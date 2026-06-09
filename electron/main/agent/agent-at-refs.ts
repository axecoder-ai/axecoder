import fs from 'node:fs/promises'
import path from 'node:path'
import { parseAtRefTokens } from '../../../shared/at-ref-parse'
import { relativeInProject, resolvePathInProject } from './agent-path'
import { loadMcpConfig, readMcpResource } from './agent-mcp'

const MAX_FILE_REF_BYTES = 64 * 1024
const MAX_DIR_ENTRIES = 100
const SKIP_DIRS = new Set(['.git', 'node_modules', '.DS_Store', '__pycache__', '.idea', '.vscode'])

export type AtRefDirEntry = { name: string; isDir: boolean }

type RefKind = 'file' | 'resource'

type ParsedRef = {
  kind: RefKind
  raw: string
  relPath?: string
  server?: string
  uri?: string
}

const appendRefBlock = (blocks: string[], tag: string, attr: string, body: string) => {
  blocks.push(`<${tag} ${attr}>\n${body}\n</${tag}>`)
}

const isBinaryHead = (buf: Buffer) => {
  const n = Math.min(buf.length, 8192)
  for (let i = 0; i < n; i++) {
    if (buf[i] === 0) return true
  }
  return false
}

const readFileRefBody = async (absPath: string, rel: string): Promise<{ body: string; isDir: boolean }> => {
  const st = await fs.stat(absPath)
  if (st.isDirectory()) {
    const lines: string[] = []
    let n = 0
    const walk = async (dir: string, prefix: string) => {
      const entries = await fs.readdir(dir, { withFileTypes: true })
      entries.sort((a, b) => a.name.localeCompare(b.name))
      for (const ent of entries) {
        if (n >= MAX_DIR_ENTRIES) return
        const relName = prefix ? `${prefix}/${ent.name}` : ent.name
        if (ent.isDirectory()) {
          if (SKIP_DIRS.has(ent.name)) continue
          lines.push(`${relName}/`)
          n += 1
          await walk(path.join(dir, ent.name), relName)
        } else {
          lines.push(relName)
          n += 1
        }
        if (n >= MAX_DIR_ENTRIES) return
      }
    }
    await walk(absPath, '')
    let body = lines.join('\n')
    if (n >= MAX_DIR_ENTRIES) body += `\n…(listing capped at ${MAX_DIR_ENTRIES} entries)`
    return { body, isDir: true }
  }
  const buf = await fs.readFile(absPath)
  if (isBinaryHead(buf)) {
    return { body: `[binary file, ${buf.length} bytes — use Read tool if needed]`, isDir: false }
  }
  let text = buf.toString('utf-8')
  if (text.length > MAX_FILE_REF_BYTES) {
    text = text.slice(0, MAX_FILE_REF_BYTES) + `\n…(truncated, was ${buf.length} bytes)`
  }
  return { body: text, isDir: false }
}

const classifyToken = (
  token: string,
  mcpServers: Set<string>,
  existsRel: (rel: string) => boolean,
): ParsedRef | null => {
  const colon = token.indexOf(':')
  if (colon > 0 && colon + 1 < token.length) {
    const server = token.slice(0, colon)
    if (mcpServers.has(server)) {
      return { kind: 'resource', raw: token, server, uri: token.slice(colon + 1) }
    }
  }
  if (existsRel(token)) {
    return { kind: 'file', raw: token, relPath: token.replace(/\\/g, '/') }
  }
  return null
}

export const listAtRefDir = async (
  projectRoot: string,
  relDir: string,
): Promise<{ ok: true; entries: AtRefDirEntry[] } | { ok: false; error: string }> => {
  const root = projectRoot.trim()
  if (!root) return { ok: false, error: 'No project root' }
  const rel = (relDir ?? '').trim().replace(/\\/g, '/').replace(/\/+$/, '')
  const abs = rel ? resolvePathInProject(root, rel) : path.resolve(root)
  if (!abs) return { ok: false, error: 'Path outside project' }
  let st
  try {
    st = await fs.stat(abs)
  } catch {
    return { ok: false, error: 'Path not found' }
  }
  if (!st.isDirectory()) return { ok: false, error: 'Not a directory' }
  const entries = await fs.readdir(abs, { withFileTypes: true })
  const out: AtRefDirEntry[] = entries
    .filter((e) => !e.name.startsWith('.') || e.isDirectory())
    .sort((a, b) => {
      if (a.isDirectory() !== b.isDirectory()) return a.isDirectory() ? -1 : 1
      return a.name.localeCompare(b.name)
    })
    .map((e) => ({ name: e.name, isDir: e.isDirectory() }))
  return { ok: true, entries: out }
}

export type ExpandAtRefsResult = {
  text: string
  errors: string[]
  resolvedCount: number
}

const tokenSkipped = (token: string, skipTokens: string[]): boolean => {
  const t = token.trim().toLowerCase()
  if (!t) return true
  for (const raw of skipTokens) {
    const s = raw.trim().toLowerCase()
    if (!s) continue
    if (t === s || t.startsWith(s)) return true
  }
  return false
}

/** 解析消息内 @path / @server:uri，注入 <file> / <dir> / <resource> 块 */
export const expandAtRefs = async (
  projectRoot: string,
  line: string,
  skipTokens: string[] = [],
): Promise<ExpandAtRefsResult> => {
  const root = projectRoot.trim()
  const text = typeof line === 'string' ? line : ''
  if (!root.trim() || !text.includes('@')) {
    return { text, errors: [], resolvedCount: 0 }
  }

  const { servers } = await loadMcpConfig(root)
  const mcpNames = new Set(servers.map((s) => s.name))
  const existsRel = (rel: string) => !!resolvePathInProject(root, rel)

  const tokens = parseAtRefTokens(text)
  const refs: ParsedRef[] = []
  for (const tok of tokens) {
    if (tokenSkipped(tok, skipTokens)) continue
    const r = classifyToken(tok, mcpNames, existsRel)
    if (r) refs.push(r)
  }
  if (!refs.length) return { text, errors: [], resolvedCount: 0 }

  const blocks: string[] = []
  const errors: string[] = []
  for (const r of refs) {
    if (r.kind === 'resource' && r.server && r.uri) {
      const res = await readMcpResource(r.server, r.uri, root)
      if (!res.ok) {
        errors.push(`@${r.raw} — ${res.error}`)
        continue
      }
      appendRefBlock(blocks, 'resource', `ref="@${r.raw}"`, res.text)
      continue
    }
    if (r.kind === 'file' && r.relPath) {
      const abs = resolvePathInProject(root, r.relPath)
      if (!abs) {
        errors.push(`@${r.raw} — outside project`)
        continue
      }
      try {
        const rel = relativeInProject(root, abs)
        const { body, isDir } = await readFileRefBody(abs, rel)
        const tag = isDir ? 'dir' : 'file'
        appendRefBlock(blocks, tag, `path="${rel}"`, body)
      } catch (e) {
        errors.push(`@${r.raw} — ${e instanceof Error ? e.message : String(e)}`)
      }
    }
  }

  if (!blocks.length) {
    return { text, errors, resolvedCount: 0 }
  }

  let out = text.trimEnd()
  if (errors.length) {
    out += `\n\n<!-- @reference errors:\n${errors.join('\n')}\n-->`
  }
  out += `\n\n${blocks.join('\n\n')}`
  return { text: out, errors, resolvedCount: blocks.length }
}
