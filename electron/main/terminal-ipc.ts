import { ipcMain, type BrowserWindow } from 'electron'
import * as pty from 'node-pty'
import fs from 'node:fs'
import { applyTerminalFocusShortcuts } from '../../shared/terminal-readline-keys'
import { getConfig } from './config-store'

type PtyEntry = { proc: pty.IPty; tabId: string }

const ptyMap = new Map<string, PtyEntry>()
let activeTabId = ''
let tabCounter = 0

const sendData = (getWin: () => BrowserWindow | null, tabId: string, text: string) => {
  getWin()?.webContents.send('terminal:data', { tabId, text })
}

const resolveCwd = (cwd: string) => {
  const target = cwd || process.env.HOME || process.cwd()
  try {
    if (fs.existsSync(target) && fs.statSync(target).isDirectory()) return target
  } catch {
    // ignore
  }
  return process.env.HOME || process.cwd()
}

const defaultShell = async () => {
  const cfg = await getConfig()
  if (cfg.terminalShell?.trim()) return cfg.terminalShell.trim()
  return process.platform === 'win32' ? process.env.COMSPEC || 'cmd.exe' : process.env.SHELL || '/bin/zsh'
}

const defaultShellArgs = async () => {
  const cfg = await getConfig()
  if (cfg.terminalShellArgs?.length) return cfg.terminalShellArgs
  return process.platform === 'win32' ? [] : ['-l']
}

export const killTerminalPty = () => {
  for (const entry of ptyMap.values()) {
    try {
      entry.proc.kill()
    } catch {
      /* dead */
    }
  }
  ptyMap.clear()
  activeTabId = ''
}

export const registerTerminalIpc = (getWin: () => BrowserWindow | null) => {
  ipcMain.handle('terminal:create', async (_, cwd: string, cols = 80, rows = 24, tabId?: string) => {
    const id = tabId?.trim() || `term-${++tabCounter}`
    if (ptyMap.has(id)) {
      try {
        ptyMap.get(id)!.proc.resize(Math.max(cols, 2), Math.max(rows, 2))
      } catch {
        /* ignore */
      }
      activeTabId = id
      return { ok: true as const, tabId: id, reused: true as const }
    }
    const shell = await defaultShell()
    const args = await defaultShellArgs()
    try {
      const proc = pty.spawn(shell, args, {
        name: 'xterm-256color',
        cols: Math.max(cols, 2),
        rows: Math.max(rows, 2),
        cwd: resolveCwd(cwd),
        env: process.env as Record<string, string>,
      })
      ptyMap.set(id, { proc, tabId: id })
      activeTabId = id
      proc.onData((data) => sendData(getWin, id, data))
      proc.onExit(() => {
        sendData(getWin, id, '\r\n[Terminal exited]\r\n')
        ptyMap.delete(id)
        if (activeTabId === id) activeTabId = ptyMap.keys().next().value ?? ''
      })
      return { ok: true as const, tabId: id }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { ok: false as const, error: message }
    }
  })

  ipcMain.handle('terminal:close', async (_, tabId: string) => {
    const entry = ptyMap.get(tabId)
    if (entry) {
      try {
        entry.proc.kill()
      } catch {
        /* dead */
      }
      ptyMap.delete(tabId)
    }
    if (activeTabId === tabId) activeTabId = ptyMap.keys().next().value ?? ''
    return { ok: true as const }
  })

  ipcMain.handle('terminal:list', async () => ({
    ok: true as const,
    tabs: [...ptyMap.keys()],
    activeTabId,
  }))

  ipcMain.handle('terminal:setActive', async (_, tabId: string) => {
    if (ptyMap.has(tabId)) activeTabId = tabId
    return { ok: true as const }
  })

  ipcMain.handle('terminal:start', async (_, cwd: string, cols = 80, rows = 24, tabId?: string) => {
    const id = tabId?.trim() || activeTabId || `term-${++tabCounter}`
    if (ptyMap.has(id)) {
      try {
        ptyMap.get(id)!.proc.resize(Math.max(cols, 2), Math.max(rows, 2))
      } catch {
        /* ignore */
      }
      activeTabId = id
      return { ok: true as const, reused: true as const, tabId: id }
    }
    const shell = await defaultShell()
    const args = await defaultShellArgs()
    try {
      const proc = pty.spawn(shell, args, {
        name: 'xterm-256color',
        cols: Math.max(cols, 2),
        rows: Math.max(rows, 2),
        cwd: resolveCwd(cwd),
        env: process.env as Record<string, string>,
      })
      ptyMap.set(id, { proc, tabId: id })
      activeTabId = id
      proc.onData((data) => sendData(getWin, id, data))
      proc.onExit(() => {
        sendData(getWin, id, '\r\n[Terminal exited]\r\n')
        ptyMap.delete(id)
        if (activeTabId === id) activeTabId = ptyMap.keys().next().value ?? ''
      })
      return { ok: true as const, tabId: id }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { ok: false as const, error: message }
    }
  })

  ipcMain.handle('terminal:write', async (_, data: string, tabId?: string) => {
    const id = tabId || activeTabId
    const entry = ptyMap.get(id)
    if (!entry) return { ok: false }
    try {
      entry.proc.write(data)
      return { ok: true }
    } catch {
      return { ok: false }
    }
  })

  ipcMain.handle('terminal:resize', async (_, cols: number, rows: number, tabId?: string) => {
    const id = tabId || activeTabId
    const entry = ptyMap.get(id)
    if (!entry) return { ok: false }
    try {
      entry.proc.resize(Math.max(cols, 2), Math.max(rows, 2))
      return { ok: true }
    } catch {
      return { ok: false }
    }
  })

  ipcMain.handle('terminal:interrupt', async (_, tabId?: string) => {
    const id = tabId || activeTabId
    const entry = ptyMap.get(id)
    if (!entry) return { ok: false }
    try {
      entry.proc.write('\x03')
      return { ok: true }
    } catch {
      return { ok: false }
    }
  })

  ipcMain.handle('terminal:stop', async (_, tabId?: string) => {
    if (tabId) {
      const entry = ptyMap.get(tabId)
      entry?.proc.kill()
      ptyMap.delete(tabId)
    } else {
      killTerminalPty()
    }
    return { ok: true as const }
  })

  ipcMain.handle('terminal:setFocused', async (_, focused: boolean) => {
    if (focused) applyTerminalFocusShortcuts()
    return { ok: true as const }
  })
}
