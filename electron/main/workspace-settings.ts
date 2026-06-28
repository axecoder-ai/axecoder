import { ipcMain } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import { getConfig, type AppConfig } from './config-store'
import { axecoderPath } from './axecoder-dir'

export type WorkspaceSettings = Partial<
  Pick<AppConfig, 'fontSize' | 'editorMinimap' | 'editorSemanticHighlighting' | 'autoSave' | 'autoSaveDelay'>
>

const workspaceSettingsPath = (projectRoot: string) =>
  path.join(projectRoot, '.axecoder', 'settings.json')

const vscodeSettingsPath = (projectRoot: string) =>
  path.join(projectRoot, '.vscode', 'settings.json')

export const readWorkspaceSettings = async (projectRoot: string): Promise<WorkspaceSettings> => {
  for (const p of [workspaceSettingsPath(projectRoot), vscodeSettingsPath(projectRoot)]) {
    try {
      const raw = await fs.readFile(p, 'utf-8')
      const parsed = JSON.parse(raw) as Record<string, unknown>
      return {
        fontSize: typeof parsed['editor.fontSize'] === 'number' ? parsed['editor.fontSize'] : parsed.fontSize as number | undefined,
        editorMinimap: typeof parsed['editor.minimap.enabled'] === 'boolean' ? parsed['editor.minimap.enabled'] : parsed.editorMinimap as boolean | undefined,
        editorSemanticHighlighting: typeof parsed['editor.semanticHighlighting.enabled'] === 'boolean' ? parsed['editor.semanticHighlighting.enabled'] : parsed.editorSemanticHighlighting as boolean | undefined,
        autoSave: typeof parsed['files.autoSave'] === 'boolean' ? parsed['files.autoSave'] : parsed.autoSave as boolean | undefined,
        autoSaveDelay: typeof parsed['files.autoSaveDelay'] === 'number' ? parsed['files.autoSaveDelay'] : parsed.autoSaveDelay as number | undefined,
      }
    } catch {
      /* try next */
    }
  }
  return {}
}

export const mergeWorkspaceSettings = async (projectRoot: string): Promise<AppConfig> => {
  const base = await getConfig()
  const ws = await readWorkspaceSettings(projectRoot)
  return { ...base, ...ws }
}

export type KeybindingEntry = { key: string; command: string; when?: string }

export const readKeybindings = async (): Promise<KeybindingEntry[]> => {
  const p = axecoderPath('keybindings.json')
  try {
    const raw = await fs.readFile(p, 'utf-8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? (parsed as KeybindingEntry[]) : []
  } catch {
    return []
  }
}

export const writeKeybindings = async (entries: KeybindingEntry[]) => {
  await fs.writeFile(axecoderPath('keybindings.json'), JSON.stringify(entries, null, 2), 'utf-8')
}

export const registerWorkspaceSettingsIpc = () => {
  ipcMain.handle('settings:readWorkspace', async (_, projectRoot: string) => ({
    ok: true as const,
    settings: await readWorkspaceSettings(projectRoot),
  }))
  ipcMain.handle('settings:mergeWorkspace', async (_, projectRoot: string) => {
    const cfg = await mergeWorkspaceSettings(projectRoot)
    return { ok: true as const, config: cfg }
  })
  ipcMain.handle('settings:readKeybindings', async () => ({
    ok: true as const,
    entries: await readKeybindings(),
  }))
  ipcMain.handle('settings:writeKeybindings', async (_, entries: KeybindingEntry[]) => {
    await writeKeybindings(entries)
    return { ok: true as const }
  })
}
