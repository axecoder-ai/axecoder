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
    }) as ChildProcessWithoutNullStreams

    shellProc.stdout.on('data', (d) => sendData(getWin, d.toString()))
    shellProc.stderr.on('data', (d) => sendData(getWin, d.toString()))
    shellProc.on('close', () => {
      sendData(getWin, '\r\n[终端已退出]\r\n')
      shellProc = null
    })

    sendData(getWin, `[WritCraft 终端] ${cwd || process.env.HOME}\r\n`)
    return { ok: true as const }
  })

  ipcMain.handle('terminal:write', async (_, data: string) => {
    if (!shellProc?.stdin.writable) return { ok: false as const }
    shellProc.stdin.write(data)
    return { ok: true as const }
  })

  ipcMain.handle('terminal:stop', async () => {
    shellProc?.kill()
    shellProc = null
    return { ok: true as const }
  })
}
