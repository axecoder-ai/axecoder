import { app, BrowserWindow, shell, ipcMain, Menu, nativeImage, screen, type MenuItemConstructorOptions } from 'electron'
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
import { parseStartupProjectPath } from './startup-args'
import { releaseHeldProjectLock } from './project-lock'
import { launchNewAppInstance } from './launch-new-instance'
import { registerAiMetricsIpc } from './ai-metrics-ipc'
import { registerAiTraceIpc } from './ai-trace-ipc'
import { getConfig } from './config-store'
import { themeBackgroundColor } from './theme-colors'
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

const startupProjectPath = parseStartupProjectPath(process.argv.slice(1))

let win: BrowserWindow | null = null
let companionWin: BrowserWindow | null = null
let metricsWin: BrowserWindow | null = null
let traceWin: BrowserWindow | null = null
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

const notifyCompanionState = (open: boolean) => {
  win?.webContents.send('window:companionState', open)
}

const notifyMetricsDetached = (detached: boolean) => {
  win?.webContents.send('window:metricsDetached', detached)
}

const notifyTraceDetached = (detached: boolean) => {
  win?.webContents.send('window:traceDetached', detached)
}

const companionWindowOpen = () =>
  companionWin !== null && !companionWin.isDestroyed()

const closeCompanionWindow = () => {
  if (!companionWindowOpen()) return
  companionWin?.close()
}

const companionWorkArea = () => {
  const displays = screen.getAllDisplays()
  const primary = screen.getPrimaryDisplay()
  const secondary = displays.find((d) => d.id !== primary.id)
  return (secondary ?? primary).workArea
}

const createCompanionWindow = () => {
  if (companionWindowOpen()) {
    companionWin?.focus()
    return
  }
  const area = companionWorkArea()
  const width = Math.min(560, Math.max(400, Math.floor(area.width * 0.38)))
  const height = Math.max(640, Math.floor(area.height * 0.88))
  const x = area.x + Math.max(0, area.width - width - 24)
  const y = area.y + Math.max(0, Math.floor((area.height - height) / 2))

  companionWin = new BrowserWindow({
    title: 'AxeCoder — Chat',
    width,
    height,
    minWidth: 360,
    minHeight: 480,
    x,
    y,
    backgroundColor: '#1e1e1e',
    icon: path.join(process.env.APP_ROOT!, 'build', 'icon.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : undefined,
    trafficLightPosition: process.platform === 'darwin' ? { x: 12, y: 10 } : undefined,
    webPreferences: { preload },
  })

  if (VITE_DEV_SERVER_URL) {
    void companionWin.loadURL(`${VITE_DEV_SERVER_URL}#companion`)
  } else {
    void companionWin.loadFile(indexHtml, { hash: 'companion' })
  }

  companionWin.on('closed', () => {
    companionWin = null
    notifyCompanionState(false)
  })

  notifyCompanionState(true)
}

const metricsWindowOpen = () => metricsWin !== null && !metricsWin.isDestroyed()

const closeMetricsWindow = () => {
  if (!metricsWindowOpen()) return
  metricsWin?.close()
}

const createMetricsWindow = async () => {
  if (metricsWindowOpen()) {
    metricsWin?.focus()
    return
  }
  const config = await getConfig()
  const backgroundColor = themeBackgroundColor(config.theme)
  const area = companionWorkArea()
  const width = Math.min(920, Math.max(640, Math.floor(area.width * 0.55)))
  const height = Math.max(520, Math.floor(area.height * 0.72))
  const x = area.x + Math.max(0, Math.floor((area.width - width) / 2))
  const y = area.y + Math.max(0, Math.floor((area.height - height) / 2))

  metricsWin = new BrowserWindow({
    title: 'AxeCoder — AI Performance',
    width,
    height,
    minWidth: 520,
    minHeight: 400,
    x,
    y,
    backgroundColor,
    icon: path.join(process.env.APP_ROOT!, 'build', 'icon.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : undefined,
    trafficLightPosition: process.platform === 'darwin' ? { x: 12, y: 10 } : undefined,
    webPreferences: { preload },
  })

  if (VITE_DEV_SERVER_URL) {
    void metricsWin.loadURL(`${VITE_DEV_SERVER_URL}#metrics`)
  } else {
    void metricsWin.loadFile(indexHtml, { hash: 'metrics' })
  }

  metricsWin.on('closed', () => {
    metricsWin = null
    notifyMetricsDetached(false)
  })

  notifyMetricsDetached(true)
}

const traceWindowOpen = () => traceWin !== null && !traceWin.isDestroyed()

const closeTraceWindow = () => {
  if (!traceWindowOpen()) return
  traceWin?.close()
}

const createTraceWindow = async () => {
  if (traceWindowOpen()) {
    traceWin?.focus()
    return
  }
  const config = await getConfig()
  const backgroundColor = themeBackgroundColor(config.theme)
  const area = companionWorkArea()
  const width = Math.min(960, Math.max(680, Math.floor(area.width * 0.58)))
  const height = Math.max(560, Math.floor(area.height * 0.75))
  const x = area.x + Math.max(0, Math.floor((area.width - width) / 2))
  const y = area.y + Math.max(0, Math.floor((area.height - height) / 2))

  traceWin = new BrowserWindow({
    title: 'AxeCoder — AI Trace',
    width,
    height,
    minWidth: 560,
    minHeight: 420,
    x,
    y,
    backgroundColor,
    icon: path.join(process.env.APP_ROOT!, 'build', 'icon.png'),
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : undefined,
    trafficLightPosition: process.platform === 'darwin' ? { x: 12, y: 10 } : undefined,
    webPreferences: { preload },
  })

  if (VITE_DEV_SERVER_URL) {
    void traceWin.loadURL(`${VITE_DEV_SERVER_URL}#trace`)
  } else {
    void traceWin.loadFile(indexHtml, { hash: 'trace' })
  }

  traceWin.on('closed', () => {
    traceWin = null
    notifyTraceDetached(false)
  })

  notifyTraceDetached(true)
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
          label: 'New Window',
          accelerator: 'CmdOrCtrl+Shift+N',
          click: () => launchNewAppInstance(),
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
          label: 'Quick Open',
          accelerator: 'CmdOrCtrl+P',
          click: () => sendMenu('menu:quickOpen'),
        },
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
  registerAiMetricsIpc()
  registerAiTraceIpc()
  ipcMain.handle('app:getStartupProjectPath', () => startupProjectPath ?? null)
  ipcMain.handle('window:getLayout', () => getWindowLayout())
  ipcMain.handle('window:getRole', (event) => {
    if (companionWin && !companionWin.isDestroyed() && event.sender === companionWin.webContents) {
      return 'companion' as const
    }
    if (metricsWin && !metricsWin.isDestroyed() && event.sender === metricsWin.webContents) {
      return 'metrics' as const
    }
    if (traceWin && !traceWin.isDestroyed() && event.sender === traceWin.webContents) {
      return 'trace' as const
    }
    return 'main' as const
  })
  ipcMain.handle('window:isCompanionOpen', () => companionWindowOpen())
  ipcMain.handle('window:openCompanion', () => {
    createCompanionWindow()
    return true
  })
  ipcMain.handle('window:closeCompanion', () => {
    closeCompanionWindow()
    return true
  })
  ipcMain.handle('window:isMetricsDetached', () => metricsWindowOpen())
  ipcMain.handle('window:openMetrics', async () => {
    await createMetricsWindow()
    return true
  })
  ipcMain.handle('window:closeMetrics', () => {
    closeMetricsWindow()
    return true
  })
  ipcMain.handle('window:setBackgroundTheme', (event, theme: string) => {
    const win = BrowserWindow.fromWebContents(event.sender)
    if (!win || win.isDestroyed()) return false
    const t =
      theme === 'aura-light' || theme === 'aura-dark' || theme === 'vscode' ? theme : 'vscode'
    win.setBackgroundColor(themeBackgroundColor(t))
    return true
  })
  ipcMain.handle('window:isTraceDetached', () => traceWindowOpen())
  ipcMain.handle('window:openTrace', async () => {
    await createTraceWindow()
    return true
  })
  ipcMain.handle('window:closeTrace', () => {
    closeTraceWindow()
    return true
  })
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
  closeCompanionWindow()
  closeMetricsWindow()
  closeTraceWindow()
  await releaseHeldProjectLock()
  const { shutdownLspServerManager } = await import('./lsp/lsp-manager')
  await shutdownLspServerManager()
  allowQuit = true
  app.quit()
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  const allWindows = BrowserWindow.getAllWindows()
  if (allWindows.length) {
    allWindows[0].focus()
  } else {
    createWindow()
  }
})

