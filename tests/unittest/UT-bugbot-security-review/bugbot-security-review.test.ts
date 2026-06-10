import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'
import { afterEach, describe, expect, it } from 'vitest'
import {
  filterToolsForCcSubagent,
  getSubagentTypeConfig,
  normalizeSubagentType,
} from '../../../electron/main/agent/agent-subagent-types'
import {
  parseReviewSubagentPrompt,
  resolveReviewDiff,
  formatReviewUserMessage,
  isReviewSubagentType,
} from '../../../electron/main/agent/agent-review-diff'
import { buildFullAgentTools } from '../../../electron/main/agent/agent-tool-registry'

const execFileAsync = promisify(execFile)

const git = async (cwd: string, ...args: string[]) => {
  await execFileAsync('git', args, { cwd })
}

const initFixtureRepo = async (): Promise<string> => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'axecoder-review-'))
  await git(dir, 'init')
  await git(dir, 'config', 'user.email', 'test@test.com')
  await git(dir, 'config', 'user.name', 'Test')
  await fs.writeFile(path.join(dir, 'README.md'), 'v1\n', 'utf8')
  await git(dir, 'add', 'README.md')
  await git(dir, 'commit', '-m', 'initial')
  await fs.writeFile(path.join(dir, 'README.md'), 'v2\n', 'utf8')
  return dir
}

describe('bugbot-security-review', () => {
  const tmpDirs: string[] = []

  afterEach(async () => {
    for (const d of tmpDirs.splice(0)) {
      await fs.rm(d, { recursive: true, force: true }).catch(() => {})
    }
  })

  it('normalizeSubagentType 识别 bugbot 与 security-review', () => {
    expect(normalizeSubagentType('bugbot')).toBe('bugbot')
    expect(normalizeSubagentType('security-review')).toBe('security-review')
    expect(isReviewSubagentType('bugbot')).toBe(true)
    expect(isReviewSubagentType('explore')).toBe(false)
  })

  it('审查专型为只读且走 subagent 档位', () => {
    const bug = getSubagentTypeConfig('bugbot')
    expect(bug.readOnly).toBe(true)
    expect(bug.modelTaskKind).toBe('subagent')
    const sec = getSubagentTypeConfig('security-review')
    expect(sec.readOnly).toBe(true)
  })

  it('bugbot 子代理过滤写与 Bash', () => {
    const tools = filterToolsForCcSubagent(buildFullAgentTools(), 'bugbot')
    const names = tools.map((t) => t.name)
    expect(names).toContain('Read')
    expect(names).not.toContain('Edit')
    expect(names).not.toContain('Bash')
  })

  it('parseReviewSubagentPrompt 解析 Cursor 形状', () => {
    const prompt = `Full Repository Path: /tmp/repo
Diff: uncommitted changes
Base Branch: main
Custom Instructions: focus on auth module`
    const f = parseReviewSubagentPrompt(prompt)
    expect(f.repoPath).toBe('/tmp/repo')
    expect(f.diffMode).toBe('uncommitted changes')
    expect(f.baseBranch).toBe('main')
    expect(f.customInstructions).toContain('auth module')
  })

  it('resolveReviewDiff uncommitted 包含工作区变更', async () => {
    const dir = await initFixtureRepo()
    tmpDirs.push(dir)
    const result = await resolveReviewDiff(dir, { diffMode: 'uncommitted changes' })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.empty).toBe(false)
    expect(result.diff).toContain('v2')
  })

  it('resolveReviewDiff 非 git 目录报错', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'axecoder-nogit-'))
    tmpDirs.push(dir)
    const result = await resolveReviewDiff(dir, { diffMode: 'uncommitted changes' })
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.error).toContain('Not a git repository')
  })

  it('formatReviewUserMessage 含 diff 与 custom instructions', () => {
    const fields = parseReviewSubagentPrompt('Diff: branch changes\nCustom Instructions: check SQL')
    const msg = formatReviewUserMessage(
      fields,
      {
        ok: true,
        diff: '+line',
        stat: ' README.md | 1 +',
        mode: 'branch changes',
        baseBranch: 'main',
        mergeBase: 'abc123',
        empty: false,
      },
      'bugbot',
    )
    expect(msg).toContain('Bugbot')
    expect(msg).toContain('check SQL')
    expect(msg).toContain('+line')
  })
})
