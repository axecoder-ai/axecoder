import { ipcMain, type BrowserWindow } from 'electron'
import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process'

let shellProc: ChildProcessWithoutNullStreams | null = null

const sendData = (getWin: () => BrowserWindow | null, text: string) => {
  getWin()?.webContents.send('terminal:data', text)
}

export const registerTerminalIpc = (getWin: () => BrowserWindow | null) => {
  ipcMain.handle('terminal:start', async (_, cwd: string) => {
    if (shellProc) {
      shellProc.kill()
      shellProc = null
    }
    const shell = process.platform === 'win32' ? 'cmd.exe' : process.env.SHELL || '/bin/zsh'
    const args = process.platform === 'win32' ? [] : ['-l']
    shellProc = spawn(shell, args, {
      cwd: cwd || process.env.HOME,
      env: process.env,
      stdio: 'pipe',
      // 独立进程组，便于 Ctrl+C 向整组发 SIGINT（如 go run 子进程）
      detached: process.platform !== 'win32',
    }) as ChildProcessWithoutNullStreams

    shellProc.stdout.on('data', (d) => sendData(getWin, d.toString()))
    shellProc.stderr.on('data', (d) => sendData(getWin, d.toString()))
    shellProc.on('close', () => {
      sendData(getWin, '\r\n[Terminal exited]\r\n')
      shellProc = null
    })

    sendData(getWin, `[AxeCoder Terminal] ${cwd || process.env.HOME}\r\n`)
    return { ok: true as const }
  })

  ipcMain.handle('terminal:write', async (_, data: string) => {
    if (!shellProc?.stdin.writable) return { ok: false as const }
    shellProc.stdin.write(data)
    return { ok: true as const }
  })

  ipcMain.handle('terminal:interrupt', async () => {
    if (!shellProc?.pid) return { ok: false as const }
    if (process.platform === 'win32') {
      if (shellProc.stdin?.writable) shellProc.stdin.write('\x03')
      return { ok: true as const }
    }
    try {
      process.kill(-shellProc.pid, 'SIGINT')
    } catch {
      if (shellProc.stdin?.writable) shellProc.stdin.write('\x03')
    }
    return { ok: true as const }
  })

  ipcMain.handle('terminal:stop', async () => {
    shellProc?.kill()
    shellProc = null
    return { ok: true as const }
  })
}
