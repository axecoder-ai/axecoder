import { describe, expect, it } from 'vitest'
import { isReadOnlyBashCommand } from '../../../electron/main/agent/agent-bash-readonly'
import { parseGitRemoteUrl, resolveForgeKind } from '../../../electron/main/git-forge/detect-forge'
import { extractPullRequestFromOutput } from '../../../electron/main/git-forge/git-operation-tracking'

describe('parseGitRemoteUrl', () => {
  it('parses HTTPS GitHub', () => {
    const r = parseGitRemoteUrl('https://github.com/owner/repo.git')
    expect(r).toEqual({
      url: 'https://github.com/owner/repo.git',
      host: 'github.com',
      owner: 'owner',
      repo: 'repo',
    })
  })

  it('parses SSH Gitee', () => {
    const r = parseGitRemoteUrl('git@gitee.com:acme/demo.git')
    expect(r?.host).toBe('gitee.com')
    expect(r?.owner).toBe('acme')
    expect(r?.repo).toBe('demo')
  })
})

describe('resolveForgeKind', () => {
  it('auto detects github.com', () => {
    expect(resolveForgeKind('github.com', 'auto')).toBe('github')
  })

  it('auto detects gitee.com', () => {
    expect(resolveForgeKind('gitee.com', 'auto')).toBe('gitee')
  })

  it('custom host when auto', () => {
    expect(resolveForgeKind('git.corp.example', 'auto')).toBe('custom')
  })

  it('user override wins', () => {
    expect(resolveForgeKind('github.com', 'gitee')).toBe('gitee')
  })
})

describe('isReadOnlyBashCommand', () => {
  it('gh pr view is read-only', () => {
    expect(isReadOnlyBashCommand('gh pr view 1 --json title')).toBe(true)
  })

  it('gh pr create is not read-only', () => {
    expect(isReadOnlyBashCommand('gh pr create --title x')).toBe(false)
  })

  it('GH_HOST prefix still detected', () => {
    expect(isReadOnlyBashCommand('GH_HOST=git.example.com gh pr list')).toBe(true)
  })
})

describe('extractPullRequestFromOutput', () => {
  it('extracts GitHub PR URL from gh create output', () => {
    const out = 'https://github.com/acme/app/pull/42\n'
    const pr = extractPullRequestFromOutput('gh pr create --title t', out, 'github')
    expect(pr?.number).toBe(42)
    expect(pr?.repository).toBe('acme/app')
  })

  it('extracts Gitee MR URL', () => {
    const out = 'Opened https://gitee.com/acme/app/pulls/7'
    const pr = extractPullRequestFromOutput('curl ...', out, 'gitee')
    expect(pr?.number).toBe(7)
    expect(pr?.forge).toBe('gitee')
  })
})
