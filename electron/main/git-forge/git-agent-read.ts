import { runGit, parsePorcelainLine } from '../git-run'

export type GitStatusAgentResult =
  | { ok: true; text: string }
  | { ok: false; error: string }

export type GitDiffAgentResult =
  | { ok: true; text: string }
  | { ok: false; error: string }

export type GitLogAgentResult =
  | { ok: true; text: string }
  | { ok: false; error: string }

/** Agent GitStatus — 格式化 git status 摘要 */
export const runGitStatusForAgent = async (cwd: string): Promise<GitStatusAgentResult> => {
  if (!cwd?.trim()) return { ok: false, error: 'No project root' }
  try {
    const branch = await runGit(cwd, ['rev-parse', '--abbrev-ref', 'HEAD'])
    const raw = await runGit(cwd, ['status', '--porcelain'])
    const lines = raw ? raw.split('\n').filter(Boolean) : []
    const changes = lines.map(parsePorcelainLine)
    let tracking: string | null = null
    let ahead = 0
    let behind = 0
    try {
      tracking = await runGit(cwd, ['rev-parse', '--abbrev-ref', '@{u}'])
      const counts = await runGit(cwd, ['rev-list', '--left-right', '--count', '@{u}...HEAD'])
      const [behindStr, aheadStr] = counts.split(/\s+/)
      behind = Number(behindStr) || 0
      ahead = Number(aheadStr) || 0
    } catch {
      tracking = null
    }
    const parts = [
      `Branch: ${branch}`,
      tracking ? `Tracking: ${tracking} (${ahead} ahead, ${behind} behind)` : 'Tracking: (none)',
      changes.length ? `Changes (${changes.length}):` : 'Working tree clean.',
      ...changes.map((c) => `  ${c.code} ${c.file}`),
    ]
    return { ok: true, text: parts.join('\n') }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Git status failed' }
  }
}

/** Agent GitDiff — staged 或 working tree；可选 ref 比较 */
export const runGitDiffForAgent = async (
  cwd: string,
  opts: { staged?: boolean; ref?: string } = {},
): Promise<GitDiffAgentResult> => {
  if (!cwd?.trim()) return { ok: false, error: 'No project root' }
  const ref = opts.ref?.trim()
  try {
    let text: string
    if (ref) {
      text = await runGit(cwd, ['diff', `${ref}...HEAD`])
    } else if (opts.staged) {
      text = await runGit(cwd, ['diff', '--cached'])
    } else {
      text = await runGit(cwd, ['diff'])
    }
    return { ok: true, text: text || '(no diff)'}
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Git diff failed' }
  }
}

/** Agent GitLog — 最近 N 条 oneline */
export const runGitLogForAgent = async (
  cwd: string,
  opts: { limit?: number; ref?: string } = {},
): Promise<GitLogAgentResult> => {
  if (!cwd?.trim()) return { ok: false, error: 'No project root' }
  const limit = Math.min(Math.max(opts.limit ?? 20, 1), 100)
  const ref = opts.ref?.trim() || 'HEAD'
  try {
    const text = await runGit(cwd, [
      'log',
      ref,
      `-n`,
      String(limit),
      '--oneline',
      '--decorate',
    ])
    return { ok: true, text: text || '(no commits)'}
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Git log failed' }
  }
}
