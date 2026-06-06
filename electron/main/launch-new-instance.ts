import { app } from 'electron'
import { spawn } from 'node:child_process'

/** 启动新的独立 AxeCoder 进程（多开 App） */
export const launchNewAppInstance = (): void => {
  if (process.platform === 'darwin') {
    const appName = app.getName()
    spawn('open', ['-n', '-a', appName], { detached: true, stdio: 'ignore' }).unref()
    return
  }
  const args = process.argv.slice(1)
  spawn(process.execPath, args, { detached: true, stdio: 'ignore' }).unref()
}
