import { spawn } from 'node:child_process'

/** 启动新的独立 AxeCoder 进程（多开 App）；复用当前 execPath/argv，避免 macOS open -a 误开其它同名 .app */
export const launchNewAppInstance = (): void => {
  const args = process.argv.slice(1)
  spawn(process.execPath, args, { detached: true, stdio: 'ignore', env: process.env }).unref()
}
