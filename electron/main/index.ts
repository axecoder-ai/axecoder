import { app, BrowserWindow, shell, ipcMain, Menu, nativeImage, type MenuItemConstructorOptions } from 'electron'
import { registerFsIpc } from './fs-ipc'
import { registerGitIpc } from './git-ipc'
import { registerTerminalIpc } from './terminal-ipc'
import { registerChatIpc } from './chat-store'
import { registerAiIpc } from './ai-ipc'
import { registerAgentIpc } from './agent-ipc'
import { registerModelsIpc } from './models-ipc'
import { runMigrate } from './migrate-writcraft'
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

app.setName('WritCraft')

if (process.platform === 'win32') app.setAppUserModelId('com.writcraft.app')

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
      label: '文件',
      submenu: [
        {
          label: '打开项目...',
          accelerator: 'CmdOrCtrl+O',
          click: sendOpenProject,
        },
        {
          label: '打开文件...',
          accelerator: 'CmdOrCtrl+Shift+O',
          click: () => sendMenu('menu:openFile'),
        },
        { type: 'separator' as const },
        {
          label: '新建文件',
          accelerator: 'CmdOrCtrl+N',
          click: () => sendMenu('menu:newFile'),
        },
        {
          label: '保存',
          accelerator: 'CmdOrCtrl+S',
          click: () => sendMenu('menu:save'),
        },
        {
          label: '另存为...',
          accelerator: 'CmdOrCtrl+Shift+S',
          click: () => sendMenu('menu:saveAs'),
        },
        {
          label: '关闭标签页',
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
      label: '编辑',
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
          label: '查找',
          accelerator: 'CmdOrCtrl+F',
          click: () => sendMenu('menu:find'),
        },
        {
          label: '在项目中查找',
          accelerator: 'CmdOrCtrl+Shift+F',
          click: () => sendMenu('menu:findInFiles'),
        },
      ],
    },
    {
      label: '视图',
      submenu: [
        {
          label: '命令面板',
          accelerator: 'CmdOrCtrl+Shift+P',
          click: () => sendMenu('menu:commandPalette'),
        },
        { type: 'separator' as const },
        {
          label: '显示/隐藏 AI 面板',
          accelerator: 'CmdOrCtrl+Shift+C',
          click: () => sendMenu('menu:toggleChat'),
        },
        {
          label: '显示/隐藏 AI 面板',
          click: () => sendMenu('menu:toggleAgents'),
        },
        {
          label: '显示/隐藏终端',
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
    title: 'WritCraft',
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
  if (process.platform === 'darwin' && app.dock) {
    const dockIcon = nativeImage.createFromPath(path.join(process.env.APP_ROOT!, 'build', 'icon.png'))
    if (!dockIcon.isEmpty()) app.dock.setIcon(dockIcon)
  }
  if (process.platform === 'darwin' || process.platform === 'linux') {
    const author =
      typeof pkg.author === 'string'
        ? pkg.author.replace(/\s*<[^>]+>\s*$/, '').trim()
        : 'WritCraft'
    app.setAboutPanelOptions({
      applicationName: 'WritCraft',
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
  registerGitIpc()
  registerTerminalIpc(() => win)
  registerChatIpc()
  registerModelsIpc()
  registerAiIpc()
  registerAgentIpc(() => win)
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

ipcMain.on('app:confirmQuit', () => {
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
