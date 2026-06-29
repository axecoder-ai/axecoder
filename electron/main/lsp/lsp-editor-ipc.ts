import type { BrowserWindow } from 'electron'
import { lazyIpcMain } from '../lazy-electron'
import path from 'node:path'
import { pathToFileURL, fileURLToPath } from 'node:url'
import type { Diagnostic, Location, LocationLink } from 'vscode-languageserver-types'
import { ensureLspForProject, getLspServerManager, lspWorkspaceSymbol, setLspDiagnosticsCallback } from './lsp-manager'
import { logOutput } from '../output-channel'

export type EditorDiagnostic = {
  file: string
  line: number
  col: number
  endLine: number
  endCol: number
  severity: 'error' | 'warning' | 'info' | 'hint'
  message: string
  source?: string
}

const docVersions = new Map<string, number>()
let diagnosticsBound = false

const sevMap = (s: number | undefined): EditorDiagnostic['severity'] => {
  if (s === 1) return 'error'
  if (s === 2) return 'warning'
  if (s === 3) return 'info'
  return 'hint'
}

const toEditorDiagnostic = (uri: string, d: Diagnostic): EditorDiagnostic => ({
  file: fileURLToPath(uri),
  line: d.range.start.line + 1,
  col: d.range.start.character + 1,
  endLine: d.range.end.line + 1,
  endCol: d.range.end.character + 1,
  severity: sevMap(d.severity),
  message: d.message,
  source: d.source,
})

const bindDiagnostics = (getWin: () => BrowserWindow | null) => {
  if (diagnosticsBound) return

  const forward = (params: unknown) => {
    const p = params as { uri?: string; diagnostics?: Diagnostic[] }
    if (!p.uri) return
    const list = (p.diagnostics ?? []).map((d) => toEditorDiagnostic(p.uri!, d))
    getWin()?.webContents.send('lsp:diagnostics', { file: fileURLToPath(p.uri), diagnostics: list })
  }

  setLspDiagnosticsCallback(forward)

  const mgr = getLspServerManager()
  if (mgr) {
    for (const server of mgr.getAllServers().values()) {
      server.onNotification('textDocument/publishDiagnostics', forward)
    }
  }
  diagnosticsBound = true
}

const nextVersion = (filePath: string) => {
  const v = (docVersions.get(filePath) ?? 0) + 1
  docVersions.set(filePath, v)
  return v
}

const absPath = (projectRoot: string, filePath: string) =>
  path.isAbsolute(filePath) ? filePath : path.join(projectRoot, filePath)

let notifyWin: (() => BrowserWindow | null) | null = null

export const setLspEditorNotifyWin = (getWin: () => BrowserWindow | null) => {
  notifyWin = getWin
}

export const notifyLspFileRefresh = (filePath: string) => {
  notifyWin?.()?.webContents.send('lsp:refreshFile', { file: filePath })
}

export const registerLspEditorIpc = (getWin: () => BrowserWindow | null) => {
  const ipcMain = lazyIpcMain()
  if (!ipcMain) return
  setLspEditorNotifyWin(getWin)
  ipcMain.handle('lsp:ensureProject', async (_, projectRoot: string) => {
    if (!projectRoot?.trim()) return { ok: false as const, error: 'No project' }
    try {
      await ensureLspForProject(projectRoot)
      bindDiagnostics(getWin)
      logOutput('LSP', `Initialized for ${projectRoot}`)
      return { ok: true as const }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'LSP init failed'
      return { ok: false as const, error: msg }
    }
  })

  ipcMain.handle(
    'lsp:didOpen',
    async (_, projectRoot: string, filePath: string, content: string) => {
      const abs = absPath(projectRoot, filePath)
      await ensureLspForProject(projectRoot)
      bindDiagnostics(getWin)
      const mgr = getLspServerManager()
      if (!mgr) return { ok: false as const, error: 'LSP unavailable' }
      const version = nextVersion(abs)
      await mgr.openFile(abs, content, version)
      return { ok: true as const, version }
    },
  )

  ipcMain.handle(
    'lsp:didChange',
    async (_, projectRoot: string, filePath: string, content: string, version?: number) => {
      const abs = absPath(projectRoot, filePath)
      const mgr = getLspServerManager()
      if (!mgr) return { ok: false as const, error: 'LSP unavailable' }
      const v = version ?? nextVersion(abs)
      docVersions.set(abs, v)
      await mgr.changeFile(abs, v, content)
      return { ok: true as const, version: v }
    },
  )

  ipcMain.handle('lsp:didClose', async (_, projectRoot: string, filePath: string) => {
    const abs = absPath(projectRoot, filePath)
    const mgr = getLspServerManager()
    if (!mgr) return { ok: true as const }
    await mgr.closeFile(abs)
    docVersions.delete(abs)
    return { ok: true as const }
  })

  ipcMain.handle(
    'lsp:hover',
    async (_, projectRoot: string, filePath: string, line: number, character: number) => {
      const abs = absPath(projectRoot, filePath)
      const mgr = getLspServerManager()
      if (!mgr) return { ok: true as const, result: null }
      const uri = pathToFileURL(abs).href
      const result = await mgr.sendRequest(abs, 'textDocument/hover', {
        textDocument: { uri },
        position: { line: line - 1, character: character - 1 },
      })
      return { ok: true as const, result }
    },
  )

  ipcMain.handle(
    'lsp:definition',
    async (_, projectRoot: string, filePath: string, line: number, character: number) => {
      const abs = absPath(projectRoot, filePath)
      const mgr = getLspServerManager()
      if (!mgr) return { ok: true as const, result: null }
      const uri = pathToFileURL(abs).href
      const result = await mgr.sendRequest<Location | Location[] | LocationLink[] | null>(
        abs,
        'textDocument/definition',
        { textDocument: { uri }, position: { line: line - 1, character: character - 1 } },
      )
      return { ok: true as const, result: result ?? null }
    },
  )

  ipcMain.handle(
    'lsp:references',
    async (_, projectRoot: string, filePath: string, line: number, character: number) => {
      const abs = absPath(projectRoot, filePath)
      const mgr = getLspServerManager()
      if (!mgr) return { ok: true as const, result: [] }
      const uri = pathToFileURL(abs).href
      const result = await mgr.sendRequest<Location[] | null>(abs, 'textDocument/references', {
        textDocument: { uri },
        position: { line: line - 1, character: character - 1 },
        context: { includeDeclaration: true },
      })
      return { ok: true as const, result: result ?? [] }
    },
  )

  ipcMain.handle(
    'lsp:completion',
    async (_, projectRoot: string, filePath: string, line: number, character: number) => {
      const abs = absPath(projectRoot, filePath)
      const mgr = getLspServerManager()
      if (!mgr) return { ok: true as const, result: null }
      const uri = pathToFileURL(abs).href
      const result = await mgr.sendRequest(abs, 'textDocument/completion', {
        textDocument: { uri },
        position: { line: line - 1, character: character - 1 },
      })
      return { ok: true as const, result }
    },
  )

  ipcMain.handle(
    'lsp:format',
    async (_, projectRoot: string, filePath: string) => {
      const abs = absPath(projectRoot, filePath)
      const mgr = getLspServerManager()
      if (!mgr) return { ok: true as const, result: null }
      const uri = pathToFileURL(abs).href
      const result = await mgr.sendRequest(abs, 'textDocument/formatting', {
        textDocument: { uri },
        options: { tabSize: 2, insertSpaces: true },
      })
      return { ok: true as const, result }
    },
  )

  ipcMain.handle('lsp:workspaceSymbol', async (_, projectRoot: string, query: string) => {
    await ensureLspForProject(projectRoot)
    const result = await lspWorkspaceSymbol(query)
    return { ok: true as const, result }
  })

  ipcMain.handle('lsp:refreshDiagnostics', async (_, projectRoot: string, filePath: string) => {
    const abs = absPath(projectRoot, filePath)
    getWin()?.webContents.send('lsp:refreshFile', { file: abs })
    return { ok: true as const }
  })
}

export const resetLspEditorState = () => {
  docVersions.clear()
  diagnosticsBound = false
}
