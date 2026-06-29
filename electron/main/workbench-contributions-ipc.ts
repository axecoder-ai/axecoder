import { ipcMain } from 'electron'
import fs from 'node:fs'
import path from 'node:path'
import { mergeContributions } from '../../shared/workbench-contributions/merge'
import type { ManifestContributes, WorkbenchContributions } from '../../shared/workbench-contributions/types'

const readJson = <T>(filePath: string): T | null => {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8')) as T
  } catch {
    return null
  }
}

const loadBuiltinManifest = (appRoot: string): ManifestContributes => {
  const p = path.join(appRoot, 'resources/builtin-workbench/manifest.json')
  return readJson<ManifestContributes>(p) ?? {}
}

const loadAxecoderExtensionManifest = (appRoot: string): ManifestContributes => {
  const pkgPath = path.join(appRoot, 'extensions/axecoder/package.json')
  const pkg = readJson<{ contributes?: ManifestContributes }>(pkgPath)
  const c = pkg?.contributes
  if (!c) return {}
  const views: ManifestContributes['views'] = {}
  if (c.views) {
    for (const [containerId, list] of Object.entries(c.views)) {
      views[containerId] = list.map((v) => ({
        id: v.id,
        name: v.name,
        type: 'webview' as const,
        webviewEntry: v.id.replace(/\./g, '-'),
      }))
    }
  }
  const commands =
    c.commands?.map((cmd) => ({
      command: cmd.command,
      title: cmd.title,
      category: cmd.category,
      icon: cmd.icon,
    })) ?? []
  return {
    viewsContainers: c.viewsContainers,
    views,
    commands,
    themes: c.themes,
  }
}

let cached: WorkbenchContributions | null = null

export const getWorkbenchContributions = (appRoot: string): WorkbenchContributions => {
  if (cached) return cached
  cached = mergeContributions(
    loadBuiltinManifest(appRoot),
    loadAxecoderExtensionManifest(appRoot),
  )
  return cached
}

export const registerWorkbenchContributionsIpc = () => {
  const appRoot = process.env.APP_ROOT ?? process.cwd()
  ipcMain.handle('workbench:getContributions', () => getWorkbenchContributions(appRoot))
}
