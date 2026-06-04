import { ipcMain, shell } from 'electron'
import { spawn } from 'node:child_process'
import { getConfig } from './config-store'
import { buildGitForgeContext, forgeEnvForBash } from './git-forge/detect-forge'
import { buildCommitPushPrPrompt } from './git-forge/forge-prompt'
import { runAgentBash } from './agent/agent-bash'

const runGit = (cwd: string, args: string[]): Promise<string> =>
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

  ipcMain.handle('git:forgeStatus', async (_, cwd: string) => {
    if (!cwd) return { ok: false as const, error: 'No project open' }
    try {
      const cfg = await getConfig()
      const ctx = await buildGitForgeContext(cwd, cfg)
      return {
        ok: true as const,
        kind: ctx.kind,
        repoSlug: ctx.repoSlug,
        ghAuth: ctx.ghAuth,
        webBase: ctx.webBase,
        apiBase: ctx.apiBase,
        defaultBranch: ctx.defaultBranch,
        remoteUrl: ctx.remote?.url ?? null,
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Forge detection failed'
      return { ok: false as const, error: msg }
    }
  })

  ipcMain.handle('git:commitPushPrPrompt', async (_, cwd: string) => {
    if (!cwd) return { ok: false as const, error: 'No project open' }
    try {
      const cfg = await getConfig()
      const ctx = await buildGitForgeContext(cwd, cfg)
      return { ok: true as const, text: buildCommitPushPrPrompt(ctx) }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Could not build prompt'
      return { ok: false as const, error: msg }
    }
  })

  ipcMain.handle('git:openUrl', async (_, url: string) => {
    const u = typeof url === 'string' ? url.trim() : ''
    if (!u.startsWith('http://') && !u.startsWith('https://')) {
      return { ok: false as const, error: 'Invalid URL' }
    }
    await shell.openExternal(u)
    return { ok: true as const }
  })

  ipcMain.handle('git:runBashWithForgeEnv', async (_, cwd: string, command: string) => {
    if (!cwd || !command?.trim()) {
      return { ok: false as const, error: 'Missing cwd or command' }
    }
    const cfg = await getConfig()
    const ctx = await buildGitForgeContext(cwd, cfg)
    const env = forgeEnvForBash(cfg, ctx)
    const res = await runAgentBash(cwd, command, undefined, env)
    return res
  })
}
