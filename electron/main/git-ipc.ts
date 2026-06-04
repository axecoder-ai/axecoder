import { ipcMain } from 'electron'
import { spawn } from 'node:child_process'

const runGit = (cwd: string, args: string[]): Promise<string> =>
  new Promise((resolve, reject) => {
    const proc = spawn('git', args, { cwd, env: process.env })
    let out = ''
    let err = ''
    proc.stdout?.on('data', (d) => { out += d.toString() })
    proc.stderr?.on('data', (d) => { err += d.toString() })
    proc.on('close', (code) => {
      if (code === 0) resolve(out.trim())
      else reject(new Error(err.trim() || `git exit ${code}`))
    })
    proc.on('error', () => reject(new Error('Git not installed or not executable')))
  })

export const registerGitIpc = () => {
  ipcMain.handle('git:status', async (_, cwd: string) => {
    if (!cwd) return { ok: false as const, error: 'No project open' }
    try {
      const branch = await runGit(cwd, ['rev-parse', '--abbrev-ref', 'HEAD'])
      const raw = await runGit(cwd, ['status', '--porcelain'])
      const changes = raw
        ? raw.split('\n').filter(Boolean).map((line) => {
            const code = line.slice(0, 2)
            const file = line.slice(3).trim()
            return { code, file }
          })
        : []
      return { ok: true as const, branch, changes }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Git unavailable'
      return { ok: false as const, error: msg }
    }
  })
}
