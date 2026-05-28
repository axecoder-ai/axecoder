import fs from 'node:fs/promises'
import path from 'node:path'
import { spawn } from 'node:child_process'
import { rgPath } from '@vscode/ripgrep'
import { isPathInsideRoot, parseRipgrepJsonLine, type SearchHit } from '../fs-utils'
import { runRipgrepFiles } from '../rg-files'
import { MAX_AGENT_FILE_BYTES, formatNumberedContent } from './edit-utils'
import { PATH_OUTSIDE_PROJECT_ERROR, relativeInProject, resolvePathInProject } from './agent-path'

const pathExists = async (p: string) => {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

export const readProjectFile = async (
  projectRoot: string,
  filePath: string,
): Promise<{ ok: true; content: string; numbered: string } | { ok: false; error: string }> => {
  const resolved = resolvePathInProject(projectRoot, filePath)
  if (!resolved) return { ok: false, error: PATH_OUTSIDE_PROJECT_ERROR }
  if (!(await pathExists(resolved))) return { ok: false, error: 'File not found' }
  const stat = await fs.stat(resolved)
  if (stat.isDirectory()) return { ok: false, error: 'Path is a directory' }
  if (stat.size > MAX_AGENT_FILE_BYTES) {
    return { ok: false, error: `File too large (max ${MAX_AGENT_FILE_BYTES} bytes)` }
  }
  const content = await fs.readFile(resolved, 'utf-8')
  return { ok: true, content, numbered: formatNumberedContent(content) }
}

export const writeProjectFile = async (resolved: string, content: string) => {
  await fs.mkdir(path.dirname(resolved), { recursive: true })
  await fs.writeFile(resolved, content, 'utf-8')
}

export const deleteProjectPath = async (resolved: string) => {
  const stat = await fs.stat(resolved)
  if (stat.isDirectory()) await fs.rm(resolved, { recursive: true })
  else await fs.unlink(resolved)
}

export const moveProjectPath = async (from: string, to: string) => {
  if (await pathExists(to)) throw new Error('Destination already exists')
  await fs.mkdir(path.dirname(to), { recursive: true })
  await fs.rename(from, to)
}

const runRipgrep = (rootPath: string, query: string): Promise<SearchHit[]> => {
  return new Promise((resolve, reject) => {
    const hits: SearchHit[] = []
    const args = [
      '--json',
      '-n',
      '--glob',
      '!node_modules/**',
      '--glob',
      '!.git/**',
      '--glob',
      '!dist/**',
      '--glob',
      '!dist-electron/**',
      query,
      rootPath,
    ]
    const proc = spawn(rgPath, args, { cwd: rootPath })
    let buf = ''
    proc.stdout.on('data', (chunk: Buffer) => {
      buf += chunk.toString()
      const lines = buf.split('\n')
      buf = lines.pop() ?? ''
      for (const line of lines) {
        const hit = parseRipgrepJsonLine(line)
        if (hit && isPathInsideRoot(rootPath, hit.file)) hits.push(hit)
      }
    })
    proc.on('error', reject)
    proc.on('close', (code) => {
      if (buf.trim()) {
        const hit = parseRipgrepJsonLine(buf)
        if (hit && isPathInsideRoot(rootPath, hit.file)) hits.push(hit)
      }
      if (code === 0 || code === 1) resolve(hits.slice(0, 500))
      else reject(new Error(`grep failed (code ${code})`))
    })
  })
}

export const GLOB_MAX_PATHS = 500

export const globProject = async (
  projectRoot: string,
  pattern: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> => {
  const pat = pattern.trim()
  if (!pat) return { ok: false, error: 'Empty pattern' }
  try {
    const absFiles = await runRipgrepFiles(projectRoot, pat)
    const rel = absFiles.map((f) => relativeInProject(projectRoot, f))
    const truncated = rel.length > GLOB_MAX_PATHS
    const shown = rel.slice(0, GLOB_MAX_PATHS)
    if (!shown.length) return { ok: true, text: 'No files found.' }
    let text = shown.join('\n')
    if (truncated) {
      text += `\n\n(Truncated: showing ${GLOB_MAX_PATHS} of ${rel.length} matches)`
    }
    return { ok: true, text }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'glob failed'
    return { ok: false, error: msg }
  }
}

export const grepProject = async (
  projectRoot: string,
  pattern: string,
): Promise<{ ok: true; text: string } | { ok: false; error: string }> => {
  const q = pattern.trim()
  if (!q) return { ok: false, error: 'Empty pattern' }
  try {
    const hits = await runRipgrep(projectRoot, q)
    if (!hits.length) return { ok: true, text: 'No matches found.' }
    const lines = hits.map((h) => `${h.file}:${h.line}:${h.col} ${h.text}`)
    return { ok: true, text: lines.join('\n') }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'grep failed'
    return { ok: false, error: msg }
  }
}
