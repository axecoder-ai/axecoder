import { spawn } from 'node:child_process'

export const runGit = (cwd: string, args: string[]): Promise<string> =>
  new Promise((resolve, reject) => {
    const proc = spawn('git', args, { cwd, env: process.env })
    let out = ''
    let err = ''
    proc.stdout?.on('data', (d) => {
      out += d.toString()
    })
    proc.stderr?.on('data', (d) => {
      err += d.toString()
    })
    proc.on('close', (code) => {
      if (code === 0) resolve(out.trim())
      else reject(new Error(err.trim() || `git exit ${code}`))
    })
    proc.on('error', () => reject(new Error('Git not installed or not executable')))
  })

/** git status --porcelain：XY 后至少一个空格再接路径；仅暂存时路径可能紧跟在第二位状态后 */
export const parsePorcelainLine = (line: string) => {
  const code = line.slice(0, 2)
  const file = (line.length > 2 && line[2] === ' ' ? line.slice(3) : line.slice(2)).trim()
  return { code, file }
}
