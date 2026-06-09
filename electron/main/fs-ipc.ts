import { ipcMain, dialog, shell, app, type BrowserWindow } from 'electron'
import fs from 'node:fs/promises'
import path from 'node:path'
import chokidar, { type FSWatcher } from 'chokidar'
import {
  destPathWithSuffix,
  fileNameFromPath,
  type ConflictAction,
  type SearchHit,
  shouldIgnoreWorkspacePath,
  WORKSPACE_WATCH_IGNORED_GLOBS,
} from './fs-utils'
import { getSettings, setSettings } from './settings-store'
import { copyCompletionSoundFrom, getCompletionSoundDataUrl } from './completion-sound'
import { copyProfileAvatarFrom } from './profile-avatar'
import { getUserAvatarDataUrl } from './users-store'
import { maybeAutoIndexCodeGraph } from './codegraph-ipc'
import {
  listProjectFiles,
  replaceInProject,
  runRipgrepSearch,
  type SearchOptions,
} from './search-utils'
import mammoth from 'mammoth'
import { acquireProjectLock } from './project-lock'
import { t } from './i18n'
export type FileNode = {
  name: string
  path: string
  type: 'file' | 'directory'
  children?: FileNode[]
}

export type { ConflictAction, SearchHit }

const sortNodes = (a: FileNode, b: FileNode) => {
  if (a.type !== b.type) return a.type === 'directory' ? -1 : 1
  return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
}

const buildTree = async (dirPath: string): Promise<FileNode> => {
  const name = path.basename(dirPath)
  const entries = await fs.readdir(dirPath, { withFileTypes: true })
  const children: FileNode[] = []
  for (const ent of entries) {
    const full = path.join(dirPath, ent.name)
    if (shouldIgnoreWorkspacePath(full)) continue
    if (ent.isSymbolicLink()) continue
    if (ent.isDirectory()) {
      children.push(await buildTree(full))
    } else {
      children.push({ name: ent.name, path: full, type: 'file' })
    }
  }
  children.sort(sortNodes)
  return { name, path: dirPath, type: 'directory', children }
}

const pathExists = async (p: string) => {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

const lastProjectFile = () => path.join(app.getPath('userData'), 'last-project.json')
const recentFilesPath = () => path.join(app.getPath('userData'), 'recent-files.json')
const recentProjectsPath = () => path.join(app.getPath('userData'), 'recent-projects.json')

const saveLastProject = async (rootPath: string) => {
  await fs.writeFile(lastProjectFile(), JSON.stringify({ rootPath }), 'utf-8')
}

const readRecentProjects = async (): Promise<string[]> => {
  try {
    const raw = await fs.readFile(recentProjectsPath(), 'utf-8')
    const list = JSON.parse(raw) as string[]
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

export const getRecentProjects = async (): Promise<string[]> => {
  let list = await readRecentProjects()
  if (list.length === 0) {
    try {
      const raw = await fs.readFile(lastProjectFile(), 'utf-8')
      const rootPath = JSON.parse(raw).rootPath as string
      if (rootPath) list = [rootPath]
    } catch {
      // 无历史Project
    }
  }
  const valid: string[] = []
  for (const p of list) {
    if (await pathExists(p)) valid.push(p)
  }
  return valid
}

const pushRecentProject = async (rootPath: string) => {
  let list = await readRecentProjects()
  list = [rootPath, ...list.filter((p) => p !== rootPath)].slice(0, 10)
  await fs.writeFile(recentProjectsPath(), JSON.stringify(list), 'utf-8')
  return list
}

const readRecentFiles = async (): Promise<string[]> => {
  try {
    const raw = await fs.readFile(recentFilesPath(), 'utf-8')
    const list = JSON.parse(raw) as string[]
    return Array.isArray(list) ? list : []
  } catch {
    return []
  }
}

const pushRecentFile = async (filePath: string) => {
  let list = await readRecentFiles()
  list = [filePath, ...list.filter((p) => p !== filePath)].slice(0, 20)
  await fs.writeFile(recentFilesPath(), JSON.stringify(list), 'utf-8')
  return list
}

const resolveDestForConflict = async (
  destPath: string,
  onConflict?: ConflictAction,
): Promise<{ destPath: string; skip: boolean }> => {
  if (!(await pathExists(destPath))) return { destPath, skip: false }
  if (onConflict === 'skip') return { destPath, skip: true }
  if (onConflict === 'replace') {
    const stat = await fs.stat(destPath)
    if (stat.isDirectory()) await fs.rm(destPath, { recursive: true })
    else await fs.unlink(destPath)
    return { destPath, skip: false }
  }
  if (onConflict === 'rename') {
    let n = 1
    let next = destPathWithSuffix(destPath, n)
    while (await pathExists(next)) {
      n += 1
      next = destPathWithSuffix(destPath, n)
    }
    return { destPath: next, skip: false }
  }
  throw new Error('Target already exists')
}

let workspaceWatcher: FSWatcher | null = null
const selfWrittenAt = new Map<string, number>()
const SELF_WRITE_IGNORE_MS = 1000

const markSelfWrite = (filePath: string) => {
  selfWrittenAt.set(path.normalize(filePath), Date.now())
}

const isSelfWrite = (filePath: string) => {
  const key = path.normalize(filePath)
  const t = selfWrittenAt.get(key)
  if (!t) return false
  if (Date.now() - t > SELF_WRITE_IGNORE_MS) {
    selfWrittenAt.delete(key)
    return false
  }
  return true
}

export const registerFsIpc = (getMainWindow: () => BrowserWindow | null) => {
  ipcMain.handle('fs:getLastProject', async () => {
    try {
      const raw = await fs.readFile(lastProjectFile(), 'utf-8')
      const rootPath = JSON.parse(raw).rootPath as string
      if (rootPath && await pathExists(rootPath)) return rootPath
    } catch {
      // 无记录或路径失效
    }
    return null
  })

  const doOpenProject = async (rootPath?: string) => {
    let folder = rootPath
    if (!folder) {
      const win = getMainWindow()
      const result = await dialog.showOpenDialog(win ?? undefined, {
        title: 'Open project',
        properties: ['openDirectory'],
      })
      if (result.canceled || !result.filePaths[0]) return null
      folder = result.filePaths[0]
    }
    if (!(await pathExists(folder))) return null
    const lock = await acquireProjectLock(folder)
    if (!lock.ok) {
      const win = getMainWindow()
      await dialog.showMessageBox(win ?? undefined, {
        type: 'warning',
        title: t('projectLock.title'),
        message: t('projectLock.alreadyOpen', { path: folder }),
        detail: t('projectLock.alreadyOpenDetail', { pid: String(lock.holder.pid) }),
      })
      return null
    }
    await saveLastProject(folder)
    await pushRecentProject(folder)
    const tree = await buildTree(folder)
    void maybeAutoIndexCodeGraph(folder)
    return { rootPath: folder, tree }
  }

  ipcMain.handle('fs:openProject', (_, rootPath?: string) => doOpenProject(rootPath))
  ipcMain.handle('fs:openFolder', () => doOpenProject())

  ipcMain.handle('fs:openFile', async () => {
    const win = getMainWindow()
    const result = await dialog.showOpenDialog(win ?? undefined, {
      title: 'Open file',
      properties: ['openFile'],
      filters: [
        { name: 'All supported', extensions: ['md', 'txt', 'json', 'pdf', 'docx', 'doc'] },
        { name: 'Documents', extensions: ['pdf', 'docx', 'doc'] },
        { name: 'Text', extensions: ['md', 'txt', 'json'] },
      ],
    })
    if (result.canceled || !result.filePaths[0]) return null
    const filePath = result.filePaths[0]
    const ext = path.extname(filePath).toLowerCase()
    if (ext === '.pdf' || ext === '.docx' || ext === '.doc') {
      await pushRecentFile(filePath)
      return { path: filePath, content: '', binary: true as const }
    }
    const content = await fs.readFile(filePath, 'utf-8')
    await pushRecentFile(filePath)
    return { path: filePath, content }
  })

  ipcMain.handle('fs:saveAs', async (_, content: string, defaultPath?: string) => {
    const win = getMainWindow()
    const result = await dialog.showSaveDialog(win ?? undefined, {
      title: 'Save as',
      defaultPath: defaultPath ?? 'untitled.md',
      filters: [{ name: 'Markdown', extensions: ['md', 'txt'] }],
    })
    if (result.canceled || !result.filePath) return null
    await fs.writeFile(result.filePath, content, 'utf-8')
    await pushRecentFile(result.filePath)
    return { path: result.filePath }
  })

  ipcMain.handle('fs:readTree', async (_, rootPath: string) => {
    const tree = await buildTree(rootPath)
    return { rootPath, tree }
  })

  ipcMain.handle('fs:readFile', async (_, filePath: string) => {
    const content = await fs.readFile(filePath, 'utf-8')
    await pushRecentFile(filePath)
    return { content }
  })

  ipcMain.handle('fs:readFileBase64', async (_, filePath: string) => {
    const buf = await fs.readFile(filePath)
    await pushRecentFile(filePath)
    const ext = path.extname(filePath).toLowerCase()
    const mimeType = ext === '.pdf' ? 'application/pdf' : 'application/octet-stream'
    return { base64: buf.toString('base64'), mimeType }
  })

  ipcMain.handle('fs:previewDocx', async (_, filePath: string) => {
    const buf = await fs.readFile(filePath)
    await pushRecentFile(filePath)
    const result = await mammoth.convertToHtml({ buffer: buf })
    return { html: result.value }
  })

  ipcMain.handle('fs:writeFile', async (_, filePath: string, content: string) => {
    await fs.writeFile(filePath, content, 'utf-8')
    markSelfWrite(filePath)
    return { ok: true as const }
  })

  ipcMain.handle('fs:createFile', async (_, parentPath: string, name: string) => {
    const filePath = path.join(parentPath, name)
    if (await pathExists(filePath)) throw new Error('File already exists')
    await fs.writeFile(filePath, '', 'utf-8')
    return { path: filePath }
  })

  ipcMain.handle('fs:createDir', async (_, parentPath: string, name: string) => {
    const dirPath = path.join(parentPath, name)
    if (await pathExists(dirPath)) throw new Error('Folder already exists')
    await fs.mkdir(dirPath)
    return { path: dirPath }
  })

  ipcMain.handle('fs:delete', async (_, targetPath: string) => {
    const stat = await fs.stat(targetPath)
    if (stat.isDirectory()) {
      await fs.rm(targetPath, { recursive: true })
    } else {
      await fs.unlink(targetPath)
    }
    return { ok: true as const }
  })

  ipcMain.handle('fs:rename', async (_, oldPath: string, newPath: string) => {
    if (await pathExists(newPath)) throw new Error('Target already exists')
    await fs.rename(oldPath, newPath)
    return { path: newPath }
  })

  ipcMain.handle(
    'fs:copy',
    async (_, srcPath: string, destPath: string, onConflict?: ConflictAction) => {
      const resolved = await resolveDestForConflict(destPath, onConflict)
      if (resolved.skip) return { path: destPath, skipped: true as const }
      const stat = await fs.stat(srcPath)
      if (stat.isDirectory()) {
        await fs.cp(srcPath, resolved.destPath, { recursive: true })
      } else {
        await fs.copyFile(srcPath, resolved.destPath)
      }
      return { path: resolved.destPath }
    },
  )

  ipcMain.handle(
    'fs:move',
    async (_, srcPath: string, destPath: string, onConflict?: ConflictAction) => {
      const resolved = await resolveDestForConflict(destPath, onConflict)
      if (resolved.skip) return { path: destPath, skipped: true as const }
      await fs.rename(srcPath, resolved.destPath)
      return { path: resolved.destPath }
    },
  )

  ipcMain.handle('fs:revealInFinder', async (_, targetPath: string) => {
    shell.showItemInFolder(targetPath)
    return { ok: true as const }
  })

  ipcMain.handle(
    'fs:search',
    async (_, rootPath: string, query: string, opts?: SearchOptions) => {
      if (!query.trim()) return { hits: [] as SearchHit[] }
      if (!(await pathExists(rootPath))) return { hits: [] as SearchHit[] }
      const hits = await runRipgrepSearch(rootPath, query.trim(), opts ?? {})
      return { hits }
    },
  )

  ipcMain.handle(
    'fs:searchReplace',
    async (
      _,
      rootPath: string,
      query: string,
      replacement: string,
      opts?: SearchOptions,
    ) => {
      if (!query.trim()) return { files: 0, replacements: 0 }
      if (!(await pathExists(rootPath))) return { files: 0, replacements: 0 }
      return replaceInProject(rootPath, query.trim(), replacement, opts ?? {})
    },
  )

  ipcMain.handle('fs:listProjectFiles', async (_, rootPath: string) => {
    if (!(await pathExists(rootPath))) return { files: [] as string[] }
    const files = await listProjectFiles(rootPath)
    return { files }
  })

  ipcMain.handle('fs:getRecentFiles', async () => {
    const list = await readRecentFiles()
    const valid: string[] = []
    for (const p of list) {
      if (await pathExists(p)) valid.push(p)
    }
    return { files: valid }
  })

  ipcMain.handle('fs:getRecentProjects', async () => {
    let list = await readRecentProjects()
    if (list.length === 0) {
      try {
        const raw = await fs.readFile(lastProjectFile(), 'utf-8')
        const rootPath = JSON.parse(raw).rootPath as string
        if (rootPath) list = [rootPath]
      } catch {
        // 无历史Project
      }
    }
    const valid: string[] = []
    for (const p of list) {
      if (await pathExists(p)) valid.push(p)
    }
    if (valid.length !== list.length) {
      await fs.writeFile(recentProjectsPath(), JSON.stringify(valid), 'utf-8')
    }
    return { projects: valid }
  })

  ipcMain.handle('fs:watchStart', async (_, rootPath: string) => {
    workspaceWatcher?.close()
    workspaceWatcher = chokidar.watch(rootPath, {
      ignored: [
        ...WORKSPACE_WATCH_IGNORED_GLOBS,
        (p: string) => shouldIgnoreWorkspacePath(p),
      ],
      ignoreInitial: true,
      followSymlinks: false,
    })
    const send = (kind: string, filePath: string) => {
      if (kind === 'change' && isSelfWrite(filePath)) return
      getMainWindow()?.webContents.send('fs:fileChanged', { kind, path: filePath })
    }
    workspaceWatcher.on('add', (p) => send('add', p))
    workspaceWatcher.on('change', (p) => send('change', p))
    workspaceWatcher.on('unlink', (p) => send('unlink', p))
    return { ok: true as const }
  })

  ipcMain.handle('fs:watchStop', async () => {
    workspaceWatcher?.close()
    workspaceWatcher = null
    return { ok: true as const }
  })

  ipcMain.handle('fs:getSettings', async () => getSettings())
  ipcMain.handle('fs:setSettings', async (_, partial) => setSettings(partial))

  ipcMain.handle('fs:pickCompletionSound', async () => {
    try {
      const win = getMainWindow()
      const result = await dialog.showOpenDialog(win ?? undefined, {
        title: 'Choose completion sound',
        properties: ['openFile'],
        filters: [
          {
            name: 'Audio',
            extensions: ['mp3', 'wav', 'ogg', 'm4a', 'aac', 'webm'],
          },
        ],
      })
      if (result.canceled || !result.filePaths[0]) {
        return { ok: true as const, cancelled: true as const }
      }
      const src = result.filePaths[0]
      const rel = await copyCompletionSoundFrom(src)
      const displayName = path.basename(src)
      await setSettings({
        agentCompletionSoundPath: rel,
        agentCompletionSoundDisplayName: displayName,
      })
      return { ok: true as const, cancelled: false as const, path: rel, displayName }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('fs:getCompletionSoundDataUrl', async () => {
    try {
      const cfg = await getSettings()
      const rel = cfg.agentCompletionSoundPath?.trim() ?? ''
      if (!rel) return { ok: true as const, dataUrl: null as string | null }
      const dataUrl = await getCompletionSoundDataUrl(rel)
      if (!dataUrl) return { ok: false as const, error: 'Could not read completion sound file' }
      return { ok: true as const, dataUrl }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })

  ipcMain.handle('fs:pickProfileAvatar', async () => {
    try {
      const win = getMainWindow()
      const result = await dialog.showOpenDialog(win ?? undefined, {
        title: 'Choose avatar',
        properties: ['openFile'],
        filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif', 'webp'] }],
      })
      if (result.canceled || !result.filePaths[0]) {
        return { ok: true as const, cancelled: true as const }
      }
      const avatarPath = await copyProfileAvatarFrom(result.filePaths[0])
      await setSettings({ profileAvatarPath: avatarPath })
      const dataUrl = await getUserAvatarDataUrl(avatarPath)
      return { ok: true as const, cancelled: false as const, avatarPath, dataUrl }
    } catch (e) {
      return { ok: false as const, error: e instanceof Error ? e.message : String(e) }
    }
  })

}
