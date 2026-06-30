import path from 'node:path'
import fs from 'node:fs/promises'
import { runGit } from '../git-run'
import { getSession } from './agent-session-store'
import type { AgentContext } from './tool-executor'

export type WorktreeEnterResult =
  | { ok: true; path: string; branch: string; alreadyThere: boolean; message: string }
  | { ok: false; error: string }

export type WorktreeExitResult =
  | { ok: true; restoredRoot: string; message: string }
  | { ok: false; error: string }

const str = (v: unknown) => (typeof v === 'string' ? v : '')

const sanitizeBranch = (raw: string) => {
  const s = raw.trim().replace(/[^a-zA-Z0-9._/-]+/g, '-').replace(/^-+|-+$/g, '')
  return s || 'axecoder-agent'
}

const resolveGitDir = async (cwd: string) => {
  const gitDir = await runGit(cwd, ['rev-parse', '--git-dir'])
  const commonDir = await runGit(cwd, ['rev-parse', '--git-common-dir'])
  const absGit = path.resolve(cwd, gitDir)
  const absCommon = path.resolve(cwd, commonDir)
  return { absGit, absCommon, inWorktree: absGit !== absCommon }
}

const isSubmodule = async (cwd: string) => {
  try {
    const sup = await runGit(cwd, ['rev-parse', '--show-superproject-working-tree'])
    return Boolean(sup.trim())
  } catch {
    return false
  }
}

const ensureWorktreesIgnored = async (toplevel: string) => {
  const rel = '.worktrees'
  try {
    await runGit(toplevel, ['check-ignore', '-q', rel])
    return
  } catch {
    // not ignored
  }
  const gitignore = path.join(toplevel, '.gitignore')
  let body = ''
  try {
    body = await fs.readFile(gitignore, 'utf-8')
  } catch {
    body = ''
  }
  if (!body.split('\n').some((line) => line.trim() === rel)) {
    const next = body.endsWith('\n') || !body ? `${body}${rel}\n` : `${body}\n${rel}\n`
    await fs.writeFile(gitignore, next, 'utf-8')
  }
}

const syncProjectRoot = (ctx: AgentContext, nextRoot: string) => {
  ctx.projectRoot = nextRoot
  if (!ctx.sessionId) return
  const live = getSession(ctx.sessionId)
  if (!live) return
  live.projectRoot = nextRoot
  live.ctx.projectRoot = nextRoot
}

export const enterWorktree = async (
  ctx: AgentContext,
  args: Record<string, unknown>,
): Promise<WorktreeEnterResult> => {
  const root = ctx.projectRoot.trim()
  if (!root) return { ok: false, error: 'No project root' }

  let toplevel: string
  try {
    toplevel = await runGit(root, ['rev-parse', '--show-toplevel'])
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Not a git repository' }
  }

  const branch = sanitizeBranch(str(args.name) || 'axecoder-agent')

  try {
    const { inWorktree, absGit } = await resolveGitDir(root)
    const submodule = await isSubmodule(root)
    if (inWorktree && !submodule) {
      const curBranch = await runGit(root, ['branch', '--show-current']).catch(() => '(detached)')
      return {
        ok: true,
        path: root,
        branch: curBranch,
        alreadyThere: true,
        message: `Already in git worktree at ${root} (branch: ${curBranch}). git-dir: ${absGit}`,
      }
    }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }

  await ensureWorktreesIgnored(toplevel)
  const worktreePath = path.join(toplevel, '.worktrees', branch)

  try {
    await fs.access(worktreePath)
    return { ok: false, error: `Worktree path already exists: ${worktreePath}` }
  } catch {
    // ok
  }

  try {
    await runGit(toplevel, ['worktree', 'add', worktreePath, '-b', branch])
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('already exists')) {
      try {
        await runGit(toplevel, ['worktree', 'add', worktreePath, branch])
      } catch (e2) {
        return { ok: false, error: e2 instanceof Error ? e2.message : String(e2) }
      }
    } else {
      return { ok: false, error: msg }
    }
  }

  const original = ctx.worktreeOriginalRoot ?? root
  ctx.worktreeOriginalRoot = original
  ctx.worktreePath = worktreePath
  syncProjectRoot(ctx, worktreePath)

  return {
    ok: true,
    path: worktreePath,
    branch,
    alreadyThere: false,
    message: `Created worktree at ${worktreePath} on branch ${branch}. Agent projectRoot switched.`,
  }
}

export const exitWorktree = async (ctx: AgentContext): Promise<WorktreeExitResult> => {
  const root = ctx.projectRoot.trim()
  if (!root) return { ok: false, error: 'No project root' }

  const original = ctx.worktreeOriginalRoot
  const worktreePath = ctx.worktreePath

  if (!original && !worktreePath) {
    try {
      const { inWorktree } = await resolveGitDir(root)
      if (!inWorktree) {
        return { ok: true, restoredRoot: root, message: 'Not in a managed worktree; projectRoot unchanged.' }
      }
    } catch {
      return { ok: true, restoredRoot: root, message: 'Worktree state unknown; projectRoot unchanged.' }
    }
  }

  const restoreTo = original ?? root
  const removePath = worktreePath ?? root

  try {
    const toplevel = await runGit(restoreTo, ['rev-parse', '--show-toplevel'])
    await runGit(toplevel, ['worktree', 'remove', removePath, '--force'])
  } catch {
    // best-effort remove
  }

  ctx.worktreeOriginalRoot = undefined
  ctx.worktreePath = undefined
  syncProjectRoot(ctx, restoreTo)

  return {
    ok: true,
    restoredRoot: restoreTo,
    message: `Exited worktree. Restored projectRoot to ${restoreTo}.`,
  }
}
