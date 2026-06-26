import { ipcMain, type BrowserWindow } from 'electron'
import * as pty from 'node-pty'
import fs from 'node:fs'
import { applyTerminalFocusShortcuts } from '../../shared/terminal-readline-keys'

let ptyProc: pty.IPty | null = null

const sendData = (getWin: () => BrowserWindow | null, text: string) => {
  getWin()?.webContents.send('terminal:data', text)
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

export const killTerminalPty = () => {
  ptyProc?.kill()
  ptyProc = null
}

export const registerTerminalIpc = (getWin: () => BrowserWindow | null) => {
  ipcMain.handle('terminal:start', async (_, cwd: string, cols = 80, rows = 24) => {
    if (ptyProc) {
      try {
        ptyProc.resize(Math.max(cols, 2), Math.max(rows, 2))
      } catch {
        // ignore resize errors while reusing session
      }
      return { ok: true as const, reused: true as const }
    }
    const shell =
      process.platform === 'win32' ? process.env.COMSPEC || 'cmd.exe' : process.env.SHELL || '/bin/zsh'
    const args = process.platform === 'win32' ? [] : ['-l']
    try {
      ptyProc = pty.spawn(shell, args, {
        name: 'xterm-256color',
        cols: Math.max(cols, 2),
        rows: Math.max(rows, 2),
        cwd: resolveCwd(cwd),
        env: process.env as Record<string, string>,
      })
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err)
      return { ok: false as const, error: message }
    }

    ptyProc.onData((data) => sendData(getWin, data))
    ptyProc.onExit(() => {
      sendData(getWin, '\r\n[Terminal exited]\r\n')
      ptyProc = null
    })

    return { ok: true as const }
  })

  ipcMain.handle('terminal:write', async (_, data: string) => {
    if (!ptyProc) return { ok: false as const }
    ptyProc.write(data)
    return { ok: true as const }
  })

  ipcMain.handle('terminal:resize', async (_, cols: number, rows: number) => {
    if (!ptyProc) return { ok: false as const }
    try {
      ptyProc.resize(Math.max(cols, 2), Math.max(rows, 2))
      return { ok: true as const }
    } catch {
      return { ok: false as const }
    }
  })

  ipcMain.handle('terminal:interrupt', async () => {
    if (!ptyProc) return { ok: false as const }
    ptyProc.write('\x03')
    return { ok: true as const }
  })

  ipcMain.handle('terminal:stop', async () => {
    killTerminalPty()
    return { ok: true as const }
  })

  ipcMain.handle('terminal:setFocused', async (_, focused: boolean) => {
    applyTerminalFocusShortcuts(getWin()?.webContents ?? null, focused)
    return { ok: true as const }
  })
}
