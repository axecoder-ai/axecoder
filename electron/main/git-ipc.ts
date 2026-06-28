import { ipcMain, shell } from 'electron'
import { spawn } from 'node:child_process'
import path from 'node:path'
import { getConfig } from './config-store'
import { buildGitForgeContext, forgeEnvForBash } from './git-forge/detect-forge'
import { buildCommitPushPrPrompt } from './git-forge/forge-prompt'
import { runAgentBash } from './agent/agent-bash'
import { logOutput } from './output-channel'

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

const resolveGitPath = (cwd: string, file: string) => {
  const f = file.trim()
  if (!f) throw new Error('Missing file path')
  return path.isAbsolute(f) ? f : path.join(cwd, f)
}

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

  ipcMain.handle('git:stage', async (_, cwd: string, file: string) => {
    if (!cwd) return { ok: false as const, error: 'No project open' }
    try {
      const p = resolveGitPath(cwd, file)
      await runGit(cwd, ['add', '--', p])
      logOutput('Git', `Staged ${file}`)
      return { ok: true as const }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Stage failed'
      return { ok: false as const, error: msg }
    }
  })

  ipcMain.handle('git:unstage', async (_, cwd: string, file: string) => {
    if (!cwd) return { ok: false as const, error: 'No project open' }
    try {
      const p = resolveGitPath(cwd, file)
      await runGit(cwd, ['reset', 'HEAD', '--', p])
      logOutput('Git', `Unstaged ${file}`)
      return { ok: true as const }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Unstage failed'
      return { ok: false as const, error: msg }
    }
  })

  ipcMain.handle('git:stageAll', async (_, cwd: string) => {
    if (!cwd) return { ok: false as const, error: 'No project open' }
    try {
      await runGit(cwd, ['add', '-A'])
      logOutput('Git', 'Staged all changes')
      return { ok: true as const }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Stage all failed'
      return { ok: false as const, error: msg }
    }
  })

  ipcMain.handle('git:commit', async (_, cwd: string, message: string, amend?: boolean) => {
    if (!cwd) return { ok: false as const, error: 'No project open' }
    const msg = message?.trim()
    if (!msg) return { ok: false as const, error: 'Commit message required' }
    try {
      const args = amend ? ['commit', '--amend', '-m', msg] : ['commit', '-m', msg]
      await runGit(cwd, args)
      logOutput('Git', amend ? `Amended commit: ${msg}` : `Committed: ${msg}`)
      return { ok: true as const }
    } catch (e) {
      const errMsg = e instanceof Error ? e.message : 'Commit failed'
      return { ok: false as const, error: errMsg }
    }
  })

  ipcMain.handle('git:diff', async (_, cwd: string, staged?: boolean) => {
    if (!cwd) return { ok: false as const, error: 'No project open' }
    try {
      const args = staged ? ['diff', '--cached'] : ['diff']
      const text = await runGit(cwd, args)
      return { ok: true as const, text }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Diff failed'
      return { ok: false as const, error: msg }
    }
  })

  ipcMain.handle('git:show', async (_, cwd: string, file: string, staged?: boolean) => {
    if (!cwd) return { ok: false as const, error: 'No project open' }
    try {
      const p = resolveGitPath(cwd, file)
      const args = staged ? ['diff', '--cached', '--', p] : ['diff', '--', p]
      const text = await runGit(cwd, args)
      return { ok: true as const, text }
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Show diff failed'
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
