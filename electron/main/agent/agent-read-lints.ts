import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { Diagnostic } from 'vscode-languageserver-types'
import { runRipgrepFiles } from '../rg-files'
import {
  ensureLspForProject,
  getInitializationStatus,
  getLspServerManager,
  waitForInitialization,
} from '../lsp/lsp-manager'
import { formatDiagnosticsResult } from '../lsp/lsp-formatters'
import { relativeInProject, resolvePathInProject } from './agent-path'

const MAX_LSP_FILE_SIZE_BYTES = 10_000_000
const MAX_AUTO_FILES = 30
const AUTO_GLOB = '**/*.{ts,tsx,js,jsx,vue,go,py,rs}'

const str = (v: unknown) => (typeof v === 'string' ? v : '')

export type ReadLintsInput = { paths: string[] }

export const parseReadLintsInput = (
  args: Record<string, unknown>,
): { ok: true; input: ReadLintsInput } | { ok: false; error: string } => {
  const raw = args.paths ?? args.path
  if (raw === undefined || raw === null) {
    return { ok: true, input: { paths: [] } }
  }
  if (typeof raw === 'string') {
    const p = raw.trim()
    return p ? { ok: true, input: { paths: [p] } } : { ok: true, input: { paths: [] } }
  }
  if (!Array.isArray(raw)) {
    return { ok: false, error: 'paths must be a string or string array' }
  }
  const paths = raw.map((row) => str(row).trim()).filter(Boolean)
  return { ok: true, input: { paths } }
}

const resolveAutoPaths = async (projectRoot: string): Promise<string[]> => {
  const absFiles = await runRipgrepFiles(projectRoot, AUTO_GLOB)
  return absFiles
    .slice(0, MAX_AUTO_FILES)
    .map((f) => relativeInProject(projectRoot, f))
    .filter(Boolean)
}

export const resolveTargetPaths = async (
  projectRoot: string,
  paths: string[],
): Promise<{ ok: true; relPaths: string[] } | { ok: false; error: string }> => {
  let relPaths = paths
  if (!relPaths.length) {
    relPaths = await resolveAutoPaths(projectRoot)
    if (!relPaths.length) {
      return {
        ok: false,
        error:
          'No paths specified and no source files found. Pass paths: ["src/foo.ts"] or configure LSP for your project.',
      }
    }
  }
  const resolved: string[] = []
  for (const p of relPaths) {
    const abs = resolvePathInProject(projectRoot, p)
    if (!abs) return { ok: false, error: `File path must be inside project: ${p}` }
    try {
      const st = await fs.stat(abs)
      if (!st.isFile()) return { ok: false, error: `Not a file: ${p}` }
    } catch {
      return { ok: false, error: `File does not exist: ${p}` }
    }
    resolved.push(p)
  }
  return { ok: true, relPaths: resolved }
}

type DocumentDiagnosticReport = {
  kind?: string
  items?: Diagnostic[]
}

export const ensureLspFileOpen = async (absolutePath: string): Promise<{ ok: true } | { ok: false; error: string }> => {
  const manager = getLspServerManager()
  if (!manager) {
    return {
      ok: false,
      error:
        'LSP server manager not initialized. Configure servers in ~/.axecoder/lsp.json or .axecoder/lsp.json.',
    }
  }
  if (manager.isFileOpen(absolutePath)) return { ok: true }
  const st = await fs.stat(absolutePath)
  if (st.size > MAX_LSP_FILE_SIZE_BYTES) {
    return {
      ok: false,
      error: `File too large for LSP analysis (${Math.ceil(st.size / 1_000_000)}MB exceeds 10MB limit)`,
    }
  }
  const content = await fs.readFile(absolutePath, 'utf-8')
  await manager.openFile(absolutePath, content)
  return { ok: true }
}

export const fetchFileDiagnostics = async (
  projectRoot: string,
  absolutePath: string,
): Promise<{ ok: boolean; diagnostics: Diagnostic[]; error?: string; noServer?: boolean }> => {
  const opened = await ensureLspFileOpen(absolutePath)
  if (!opened.ok) return { ok: false, diagnostics: [], error: opened.error }

  const manager = getLspServerManager()
  if (!manager) {
    return { ok: false, diagnostics: [], error: 'LSP server manager not initialized.' }
  }

  const uri = pathToFileURL(absolutePath).href
  const report = await manager.sendRequest<DocumentDiagnosticReport>(absolutePath, 'textDocument/diagnostic', {
    textDocument: { uri },
  })

  if (report === undefined) {
    return { ok: true, diagnostics: [], noServer: true }
  }

  return { ok: true, diagnostics: report?.items ?? [] }
}

const fetchDiagnostics = async (
  projectRoot: string,
  absolutePath: string,
): Promise<{ ok: boolean; text: string }> => {
  const res = await fetchFileDiagnostics(projectRoot, absolutePath)
  if (!res.ok) return { ok: false, text: res.error ?? 'diagnostics failed' }
  const rel = relativeInProject(projectRoot, absolutePath) || absolutePath
  if (res.noServer) {
    return { ok: true, text: `${rel}: (no LSP server for ${path.extname(absolutePath)})` }
  }
  return { ok: true, text: formatDiagnosticsResult(rel, res.diagnostics, projectRoot) }
}

export const executeAgentReadLints = async (
  projectRoot: string,
  args: Record<string, unknown>,
): Promise<{ ok: boolean; text: string }> => {
  const parsed = parseReadLintsInput(args)
  if (!parsed.ok) return { ok: false, text: parsed.error }

  const targets = await resolveTargetPaths(projectRoot, parsed.input.paths)
  if (!targets.ok) return { ok: false, text: targets.error }

  await ensureLspForProject(projectRoot)
  if (getInitializationStatus() === 'pending') await waitForInitialization()

  const chunks: string[] = []
  let anyOk = true
  for (const relPath of targets.relPaths) {
    const absolutePath = resolvePathInProject(projectRoot, relPath)!
    const res = await fetchDiagnostics(projectRoot, absolutePath)
    if (!res.ok) anyOk = false
    chunks.push(res.text)
  }

  const body = chunks.join('\n\n')
  if (!body.trim()) {
    return { ok: true, text: 'No diagnostics found.' }
  }
  return { ok: anyOk, text: body }
}
