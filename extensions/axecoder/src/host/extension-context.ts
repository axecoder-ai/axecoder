import * as vscode from 'vscode'

let extensionContext: vscode.ExtensionContext | undefined
let companionOpen = false
const watchers = new Map<string, vscode.FileSystemWatcher>()

export const setExtensionContext = (ctx: vscode.ExtensionContext): void => {
  extensionContext = ctx
}

export const getExtensionContext = (): vscode.ExtensionContext | undefined => extensionContext

export const setCompanionOpen = (open: boolean): void => {
  companionOpen = open
}

export const isCompanionOpen = (): boolean => companionOpen

const RECENT_PROJECTS_KEY = 'axecoder.recentProjects'

export const trackRecentProject = async (rootPath: string): Promise<void> => {
  const ctx = extensionContext
  if (!ctx || !rootPath.trim()) return
  const prev = (ctx.globalState.get<string[]>(RECENT_PROJECTS_KEY) ?? []).filter(
    (p) => p !== rootPath,
  )
  const next = [rootPath, ...prev].slice(0, 12)
  await ctx.globalState.update(RECENT_PROJECTS_KEY, next)
}

export const getRecentProjects = (): string[] =>
  extensionContext?.globalState.get<string[]>(RECENT_PROJECTS_KEY) ?? []

export const getLastProject = (): string | null => getRecentProjects()[0] ?? null

export const startFileWatch = (rootPath: string): void => {
  if (!rootPath.trim() || watchers.has(rootPath)) return
  const pattern = new vscode.RelativePattern(rootPath, '**/*')
  const watcher = vscode.workspace.createFileSystemWatcher(pattern)
  watchers.set(rootPath, watcher)
}

export const stopFileWatch = (rootPath: string): void => {
  const w = watchers.get(rootPath)
  if (w) {
    w.dispose()
    watchers.delete(rootPath)
  }
}
