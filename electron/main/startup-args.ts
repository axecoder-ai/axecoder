import fs from 'node:fs'
import path from 'node:path'

const isSkippableArg = (arg: string): boolean => {
  if (!arg || arg.startsWith('-')) return true
  if (arg === 'electron' || arg === 'Electron') return true
  if (arg.endsWith('.asar')) return true
  if (arg.includes('node_modules/electron')) return true
  if (arg.includes('dist-electron')) return true
  if (arg.includes('vite')) return true
  return false
}

/** 从进程 argv 解析启动时要打开的项目目录（首个存在的绝对/相对目录参数） */
export const parseStartupProjectPath = (argv: string[]): string | undefined => {
  for (const arg of argv) {
    if (isSkippableArg(arg)) continue
    let resolved: string
    try {
      resolved = path.resolve(arg)
    } catch {
      continue
    }
    try {
      if (fs.statSync(resolved).isDirectory()) return resolved
    } catch {
      // not a directory
    }
  }
  return undefined
}
