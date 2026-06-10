import { spawn } from 'node:child_process'
import { getDefaultBranch } from '../git-forge/detect-forge'
import { trimBashOutput } from './agent-bash'

export type ReviewDiffMode = 'branch changes' | 'uncommitted changes'

export type ReviewPromptFields = {
  repoPath?: string
  diffMode: ReviewDiffMode
  baseBranch?: string
  customInstructions?: string
  rawPrompt: string
}

export type ReviewDiffResult =
  | {
      ok: true
      diff: string
      stat: string
      mode: ReviewDiffMode
      baseBranch: string | null
      mergeBase: string | null
      empty: boolean
    }
  | { ok: false; error: string }

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
      if (code === 0) resolve(out)
      else reject(new Error(err.trim() || `git exit ${code}`))
    })
    proc.on('error', () => reject(new Error('Git not installed or not executable')))
  })

const parseLineValue = (line: string, prefix: string): string | undefined => {
  const p = prefix.trim()
  if (!line.startsWith(p)) return undefined
  const v = line.slice(p.length).trim()
  return v || undefined
}

/** 解析 Cursor review 子代理 prompt 形状 */
export const parseReviewSubagentPrompt = (prompt: string): ReviewPromptFields => {
  const rawPrompt = prompt.trim()
  let repoPath: string | undefined
  let diffMode: ReviewDiffMode = 'branch changes'
  let baseBranch: string | undefined
  let customInstructions: string | undefined

  const lines = rawPrompt.split('\n')
  let inCustom = false
  const customLines: string[] = []

  for (const line of lines) {
    if (inCustom) {
      customLines.push(line)
      continue
    }
    const repo = parseLineValue(line, 'Full Repository Path:')
    if (repo) {
      repoPath = repo
      continue
    }
    const diff = parseLineValue(line, 'Diff:')
    if (diff) {
      const d = diff.toLowerCase()
      if (d.includes('uncommitted')) diffMode = 'uncommitted changes'
      else diffMode = 'branch changes'
      continue
    }
    const base = parseLineValue(line, 'Base Branch:')
    if (base) {
      baseBranch = base
      continue
    }
    if (line.startsWith('Custom Instructions:')) {
      const rest = line.slice('Custom Instructions:'.length).trim()
      if (rest) customLines.push(rest)
      inCustom = true
    }
  }

  if (customLines.length) {
    customInstructions = customLines.join('\n').trim() || undefined
  }

  return { repoPath, diffMode, baseBranch, customInstructions, rawPrompt }
}

export const isReviewSubagentType = (t: string): t is 'bugbot' | 'security-review' =>
  t === 'bugbot' || t === 'security-review'

const resolveBaseRef = async (repoRoot: string, baseBranch?: string): Promise<string | null> => {
  const explicit = baseBranch?.trim()
  if (explicit) {
    try {
      await runGit(repoRoot, ['rev-parse', '--verify', explicit])
      return explicit
    } catch {
      try {
        await runGit(repoRoot, ['rev-parse', '--verify', `origin/${explicit}`])
        return `origin/${explicit}`
      } catch {
        return explicit
      }
    }
  }
  return getDefaultBranch(repoRoot)
}

/** 计算审查用 git diff（branch changes 或 uncommitted changes） */
export const resolveReviewDiff = async (
  projectRoot: string,
  fields: Pick<ReviewPromptFields, 'diffMode' | 'baseBranch'>,
): Promise<ReviewDiffResult> => {
  const repoRoot = projectRoot.trim()
  if (!repoRoot) return { ok: false, error: 'Repository path is required' }

  try {
    await runGit(repoRoot, ['rev-parse', '--is-inside-work-tree'])
  } catch {
    return { ok: false, error: 'Not a git repository' }
  }

  const mode = fields.diffMode
  try {
    if (mode === 'uncommitted changes') {
      const diff = trimBashOutput(await runGit(repoRoot, ['diff', 'HEAD']))
      const stat = trimBashOutput(await runGit(repoRoot, ['diff', '--stat', 'HEAD']))
      return {
        ok: true,
        diff,
        stat,
        mode,
        baseBranch: null,
        mergeBase: null,
        empty: !diff.trim(),
      }
    }

    const base = await resolveBaseRef(repoRoot, fields.baseBranch)
    if (!base) {
      return { ok: false, error: 'Could not determine base branch for branch changes review' }
    }

    let mergeBase: string
    try {
      mergeBase = (await runGit(repoRoot, ['merge-base', 'HEAD', base])).trim()
    } catch {
      try {
        mergeBase = (await runGit(repoRoot, ['merge-base', 'HEAD', `origin/${base}`])).trim()
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'merge-base failed'
        return { ok: false, error: msg }
      }
    }

    const diff = trimBashOutput(await runGit(repoRoot, ['diff', mergeBase]))
    const stat = trimBashOutput(await runGit(repoRoot, ['diff', '--stat', mergeBase]))
    return {
      ok: true,
      diff,
      stat,
      mode,
      baseBranch: base,
      mergeBase,
      empty: !diff.trim(),
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'git diff failed'
    return { ok: false, error: msg }
  }
}

/** 将 diff 与说明格式化为子代理 user 消息 */
export const formatReviewUserMessage = (
  fields: ReviewPromptFields,
  diffResult: Extract<ReviewDiffResult, { ok: true }>,
  reviewKind: 'bugbot' | 'security-review',
): string => {
  const kindLabel = reviewKind === 'bugbot' ? 'Bugbot' : 'Security Review'
  const parts: string[] = [
    `# ${kindLabel} — precomputed diff`,
    '',
    `Diff mode: ${diffResult.mode}`,
  ]
  if (diffResult.baseBranch) parts.push(`Base branch: ${diffResult.baseBranch}`)
  if (diffResult.mergeBase) parts.push(`Merge-base: ${diffResult.mergeBase}`)
  parts.push('')

  if (fields.customInstructions?.trim()) {
    parts.push('## Custom Instructions', fields.customInstructions.trim(), '')
  }

  if (diffResult.empty) {
    parts.push('## Diff', '(empty — no changes to review)', '')
  } else {
    parts.push('## Diff stat', '```', diffResult.stat.trim() || '(no stat)', '```', '')
    parts.push('## Diff', '```diff', diffResult.diff.trim(), '```', '')
  }

  parts.push(
    '## Your task',
    reviewKind === 'bugbot' ?
      'Review the diff for bugs, logic errors, regressions, and missing edge cases. Use Read/Grep to inspect surrounding context when needed.'
    : 'Review the diff for security issues (injection, auth, secrets, unsafe defaults, path traversal, etc.). Use Read/Grep for context.',
    'Return findings sorted by severity (highest first). Use markdown table columns: Severity | Location (file:line) | Finding.',
    'If no issues, state clearly that review found no issues. Do not modify files.',
  )

  if (fields.rawPrompt && !fields.rawPrompt.includes('Full Repository Path:')) {
    parts.push('', '## Original prompt', fields.rawPrompt)
  }

  return parts.join('\n')
}

/** bugbot / security-review 启动时构建 user 消息（含 diff 预注入） */
export const buildReviewSubagentUserContent = async (
  projectRoot: string,
  prompt: string,
  reviewKind: 'bugbot' | 'security-review',
): Promise<string> => {
  const fields = parseReviewSubagentPrompt(prompt)
  const repo = fields.repoPath?.trim() || projectRoot
  const diffResult = await resolveReviewDiff(repo, fields)
  if (!diffResult.ok) {
    return `${prompt.trim()}\n\n[Review diff error: ${diffResult.error}]`
  }
  return formatReviewUserMessage(fields, diffResult, reviewKind)
}
