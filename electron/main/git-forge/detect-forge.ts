import { spawn } from 'node:child_process'
import type { AppConfig } from '../models-types'
import type { GitForgeContext, GitForgeKind, GitRemoteInfo } from './forge-types'
import { getGhAuthStatus } from './gh-auth'

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
    proc.on('error', () => reject(new Error('Git not installed')))
  })

/** 解析 git remote URL（HTTPS / SSH） */
export const parseGitRemoteUrl = (raw: string): GitRemoteInfo | null => {
  const url = raw.trim()
  if (!url) return null

  const scp = url.match(/^git@([^:]+):([^/]+)\/(.+?)(?:\.git)?$/i)
  if (scp) {
    return {
      url,
      host: scp[1],
      owner: scp[2],
      repo: scp[3].replace(/\.git$/i, ''),
    }
  }

  try {
    const normalized = url.replace(/\.git$/i, '')
    const u = new URL(normalized.startsWith('http') ? normalized : `https://${normalized}`)
    const parts = u.pathname.split('/').filter(Boolean)
    if (parts.length >= 2) {
      return {
        url,
        host: u.host,
        owner: parts[0],
        repo: parts[1],
      }
    }
  } catch {
    /* ignore */
  }
  return null
}

export const resolveForgeKind = (
  host: string,
  providerSetting: AppConfig['gitForgeProvider'],
): GitForgeKind => {
  if (providerSetting === 'github' || providerSetting === 'gitee' || providerSetting === 'custom') {
    return providerSetting
  }
  const h = host.toLowerCase()
  if (h === 'github.com' || h.endsWith('.github.com')) return 'github'
  if (h === 'gitee.com' || h.endsWith('.gitee.com')) return 'gitee'
  if (h) return 'custom'
  return 'unknown'
}

const defaultWebBase = (kind: GitForgeKind, host: string): string | null => {
  if (kind === 'github') return host && !host.includes('github.com') ? `https://${host}` : 'https://github.com'
  if (kind === 'gitee') return 'https://gitee.com'
  if (kind === 'custom' && host) return `https://${host}`
  return null
}

const defaultApiBase = (kind: GitForgeKind, webBase: string | null): string | null => {
  if (kind === 'github') {
    if (webBase && !webBase.includes('github.com')) {
      return `${webBase.replace(/\/$/, '')}/api/v3`
    }
    return 'https://api.github.com'
  }
  if (kind === 'gitee') return 'https://gitee.com/api/v5'
  if (kind === 'custom' && webBase) return `${webBase.replace(/\/$/, '')}/api/v1`
  return null
}

export const getGitRemoteOrigin = async (projectRoot: string): Promise<string | null> => {
  try {
    return await runGit(projectRoot, ['remote', 'get-url', 'origin'])
  } catch {
    return null
  }
}

export const getDefaultBranch = async (projectRoot: string): Promise<string | null> => {
  try {
    const ref = await runGit(projectRoot, ['symbolic-ref', 'refs/remotes/origin/HEAD'])
    const m = ref.match(/refs\/remotes\/origin\/(.+)/)
    return m?.[1] ?? null
  } catch {
    try {
      return await runGit(projectRoot, ['rev-parse', '--abbrev-ref', 'HEAD'])
    } catch {
      return null
    }
  }
}

/** 合并 remote 检测与用户设置，得到 forge 上下文 */
export const buildGitForgeContext = async (
  projectRoot: string,
  cfg: AppConfig,
): Promise<GitForgeContext> => {
  const remoteUrl = await getGitRemoteOrigin(projectRoot)
  const remote = remoteUrl ? parseGitRemoteUrl(remoteUrl) : null
  const kind = resolveForgeKind(remote?.host ?? '', cfg.gitForgeProvider)
  const ghAuth = await getGhAuthStatus()
  const defaultBranch = await getDefaultBranch(projectRoot)

  const webBase =
    cfg.gitForgeWebBase?.trim() ||
    defaultWebBase(kind, remote?.host ?? '') ||
    null
  const apiBase =
    cfg.gitForgeApiBase?.trim() ||
    defaultApiBase(kind, webBase) ||
    null

  const repoSlug = remote ? `${remote.owner}/${remote.repo}` : null

  return {
    kind,
    remote,
    defaultBranch,
    ghAuth,
    webBase,
    apiBase,
    repoSlug,
  }
}

/** Bash 执行前注入 forge 相关环境变量 */
export const forgeEnvForBash = (cfg: AppConfig, ctx: GitForgeContext): NodeJS.ProcessEnv => {
  const env = { ...process.env }
  if (ctx.kind === 'github' && ctx.webBase && !ctx.webBase.includes('github.com')) {
    try {
      env.GH_HOST = new URL(ctx.webBase).host
    } catch {
      /* ignore */
    }
  }
  if (cfg.gitForgeAccessToken?.trim()) {
    if (ctx.kind === 'gitee') env.GITEE_TOKEN = cfg.gitForgeAccessToken.trim()
    if (ctx.kind === 'github') env.GH_TOKEN = cfg.gitForgeAccessToken.trim()
  }
  return env
}
