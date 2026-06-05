import { app, BrowserWindow, shell, ipcMain, Menu, nativeImage, type MenuItemConstructorOptions } from 'electron'
import { registerFsIpc } from './fs-ipc'
import { registerCodeGraphIpc } from './codegraph-ipc'
import { registerMarkdownExportIpc } from './markdown-export-ipc'
import { registerGitIpc } from './git-ipc'
import { registerTerminalIpc } from './terminal-ipc'
import { registerChatIpc } from './chat-store'
import { registerSessionIpc } from './session/session-ipc'
import { registerWorkshopIpc } from './workshop-ipc'
import { registerAiIpc } from './ai-ipc'
import { registerAgentIpc } from './agent-ipc'
import { registerModelsIpc } from './models-ipc'
import { registerUsersIpc } from './users-ipc'
import { registerRulesIpc } from './rules/rules-ipc'
import { registerSkillsIpc } from './skills/skills-ipc'
import { runMigrate } from './migrate-axecoder'
import { refreshMainLocale } from './i18n'
import Store from 'electron-store'
import { createRequire } from 'node:module'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'

const require = createRequire(import.meta.url)
const __dirname = path.dirname(fileURLToPath(import.meta.url))

process.env.APP_ROOT = path.join(__dirname, '../..')

const pkg = require(path.join(process.env.APP_ROOT, 'package.json')) as {
  version: string
  description?: string
  author?: string
}

export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')
export const VITE_DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL
  ? path.join(process.env.APP_ROOT, 'public')
  : RENDERER_DIST

if (os.release().startsWith('6.1')) app.disableHardwareAcceleration()

app.commandLine.appendSwitch('lang', 'en-US')

app.setName('AxeCoder')

if (process.platform === 'win32') app.setAppUserModelId('com.axecoder.app')

if (!app.requestSingleInstanceLock()) {
  app.quit()
  process.exit(0)
}

let win: BrowserWindow | null = null
let allowQuit = false
const preload = path.join(__dirname, '../preload/index.mjs')
const indexHtml = path.join(RENDERER_DIST, 'index.html')

const getWindowLayout = () => ({
  fullscreen: win?.isFullScreen() ?? false,
  platform: process.platform,
})

const sendWindowLayout = () => {
  win?.webContents.send('window:layout', getWindowLayout())
}

const sendMenu = (channel: string) => {
  win?.webContents.send(channel)
}

const setupAppMenu = (getWin: () => BrowserWindow | null) => {
  const sendOpenProject = () => {
    getWin()?.webContents.send('project:open')
  }
  const template: MenuItemConstructorOptions[] = [
    ...(process.platform === 'darwin'
      ? [{
          label: app.name,
          submenu: [
            { role: 'about' as const },
            { type: 'separator' as const },
            { role: 'services' as const },
            { type: 'separator' as const },
            { role: 'hide' as const },
            { role: 'hideOthers' as const },
            { role: 'unhide' as const },
            { type: 'separator' as const },
            { role: 'quit' as const },
          ],
        }]
      : []),
    {
      label: 'File',
      submenu: [
        {
          label: 'Open Project...',
          accelerator: 'CmdOrCtrl+O',
          click: sendOpenProject,
        },
        {
          label: 'Open File...',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => sendMenu('menu:openFile'),
        },
        { type: 'separator' as const },
        {
          label: 'New File',
          accelerator: 'CmdOrCtrl+N',
          click: () => sendMenu('menu:newFile'),
        },
        {
          label: 'Save',
          accelerator: 'CmdOrCtrl+S',
          click: () => sendMenu('menu:save'),
        },
        {
          label: 'Save As...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => sendMenu('menu:saveAs'),
        },
        {
          label: 'Close Tab',
          accelerator: 'CmdOrCtrl+W',
          click: () => sendMenu('menu:closeTab'),
        },
        { type: 'separator' as const },
        process.platform === 'darwin'
          ? { role: 'close' as const }
          : { role: 'quit' as const },
      ],
    },
    {
      label: 'Edit',
      submenu: [
        { role: 'undo' as const },
        { role: 'redo' as const },
        { type: 'separator' as const },
        { role: 'cut' as const },
        { role: 'copy' as const },
        { role: 'paste' as const },
        { role: 'selectAll' as const },
        { type: 'separator' as const },
        {
          label: 'Find',
          accelerator: 'CmdOrCtrl+F',
          click: () => sendMenu('menu:find'),
        },
        {
          label: 'Find in Project',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => sendMenu('menu:findInFiles'),
        },
      ],
    },
    {
      label: 'View',
      submenu: [
        {
          label: 'Command Palette',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => sendMenu('menu:commandPalette'),
        },
        { type: 'separator' as const },
        {
          label: 'Toggle Chat Panel',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => sendMenu('menu:toggleChat'),
        },
        {
          label: 'Toggle Agents Panel',
          click: () => sendMenu('menu:toggleAgents'),
        },
        {
          label: 'Toggle Terminal',
          accelerator: 'CmdOrCtrl+`',
          click: () => sendMenu('menu:toggleTerminal'),
        },
        { type: 'separator' as const },
        { role: 'reload' as const },
        { role: 'toggleDevTools' as const },
        { type: 'separator' as const },
        { role: 'resetZoom' as const },
        { role: 'zoomIn' as const },
        { role: 'zoomOut' as const },
        { type: 'separator' as const },
        { role: 'togglefullscreen' as const },
      ],
    },
  ]
  Menu.setApplicationMenu(Menu.buildFromTemplate(template))
}

async function createWindow() {
  win = new BrowserWindow({
    title: 'AxeCoder',
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 640,
    backgroundColor: '#1e1e1e',
    icon: path.join(process.env.APP_ROOT!, 'build', 'icon.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : undefined,
    trafficLightPosition: process.platform === 'darwin' ? { x: 12, y: 10 } : undefined,
    webPreferences: {
      preload,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(indexHtml)
  }

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', new Date().toLocaleString())
    sendWindowLayout()
  })

  win.on('enter-full-screen', sendWindowLayout)
  win.on('leave-full-screen', sendWindowLayout)

  win.webContents.setWindowOpenHandler(({ url }) => {
    if (url.startsWith('https:')) shell.openExternal(url)
    return { action: 'deny' }
  })

  win.on('close', (e) => {
    if (allowQuit) return
    e.preventDefault()
    win?.webContents.send('app:beforeQuit')
  })

  win.on('closed', () => {
    win = null
  })
}

app.whenReady().then(async () => {
  await refreshMainLocale()
  if (process.platform === 'darwin' && app.dock) {
    const dockIcon = nativeImage.createFromPath(path.join(process.env.APP_ROOT!, 'build', 'icon.png'))
    if (!dockIcon.isEmpty()) app.dock.setIcon(dockIcon)
  }
  if (process.platform === 'darwin' || process.platform === 'linux') {
    const author =
      typeof pkg.author === 'string'
        ? pkg.author.replace(/\s*<[^>]+>\s*$/, '').trim()
        : 'AxeCoder'
    app.setAboutPanelOptions({
      applicationName: 'AxeCoder',
      applicationVersion: pkg.version,
      version: pkg.version,
      copyright: `Copyright © ${new Date().getFullYear()} ${author}`,
      credits: pkg.description ?? '',
      iconPath: path.join(process.env.APP_ROOT!, 'build', 'icon.png'),
    })
  }
  const legacyStore = new Store<{
    autoSave?: boolean
    autoSaveDelay?: number
    fontSize?: number
    aiEndpoint?: string
    aiModel?: string
    aiApiKey?: string
  }>()
  const ep = legacyStore.get('aiEndpoint') ?? ''
  const em = legacyStore.get('aiModel') ?? ''
  const ek = legacyStore.get('aiApiKey') ?? ''
  await runMigrate({
    legacyAi: ep.trim() && em.trim() && ek.trim()
      ? { aiEndpoint: ep, aiModel: em, aiApiKey: ek }
      : undefined,
    legacyConfig: {
      autoSave: legacyStore.get('autoSave'),
      autoSaveDelay: legacyStore.get('autoSaveDelay'),
      fontSize: legacyStore.get('fontSize'),
    },
    legacyChatPath: path.join(app.getPath('userData'), 'chat-sessions.json'),
  })
  registerFsIpc(() => win)
  registerCodeGraphIpc(() => win)
  registerMarkdownExportIpc(() => win)
  registerGitIpc()
  registerTerminalIpc(() => win)
  registerChatIpc()
  registerSessionIpc()
  registerModelsIpc()
  registerUsersIpc(() => win)
  registerRulesIpc()
  registerSkillsIpc()
  registerAiIpc()
  registerAgentIpc(() => win)
  registerWorkshopIpc(() => win)
  ipcMain.handle('window:getLayout', () => getWindowLayout())
  setupAppMenu(() => win)
  createWindow()
})

app.on('before-quit', (e) => {
  if (allowQuit) return
  const target = win ?? BrowserWindow.getAllWindows()[0]
  if (!target) return
  e.preventDefault()
  target.webContents.send('app:beforeQuit')
})

ipcMain.on('app:confirmQuit', async () => {
  const { shutdownLspServerManager } = await import('./lsp/lsp-manager')
  await shutdownLspServerManager()
  allowQuit = true
  app.quit()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('second-instance', () => {
  if (win) {
    if (win.isMinimized()) win.restore()
    win.focus()
  }
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

ipcMain.handle('open-win', (_, arg) => {
  const childWindow = new BrowserWindow({
    webPreferences: {
      preload,
      nodeIntegration: true,
      contextIsolation: false,
    },
  })

  if (VITE_DEV_SERVER_URL) {
    childWindow.loadURL(`${VITE_DEV_SERVER_URL}#${arg}`)
  } else {
    childWindow.loadFile(indexHtml, { hash: arg })
  }
})
