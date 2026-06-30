import { describe, expect, it } from 'vitest'
import { isReadOnlyBashCommand } from '../../../electron/main/agent/agent-bash-readonly'
import {
  buildInvestigateCiPrompt,
  getGitCiPromptSection,
  getGitForgePromptSection,
} from '../../../electron/main/git-forge/forge-prompt'
import type { GitForgeContext } from '../../../electron/main/git-forge/forge-types'

const githubCtx: GitForgeContext = {
  kind: 'github',
  remote: {
    url: 'https://github.com/acme/app.git',
    host: 'github.com',
    owner: 'acme',
    repo: 'app',
  },
  defaultBranch: 'main',
  ghAuth: 'logged in',
  webBase: 'https://github.com',
  apiBase: 'https://api.github.com',
  repoSlug: 'acme/app',
}

describe('getGitCiPromptSection', () => {
  it('includes gh pr checks workflow for github', () => {
    const s = getGitCiPromptSection(githubCtx)
    expect(s).toContain('gh pr checks')
    expect(s).toContain('gh run view')
  })
})

describe('getGitForgePromptSection', () => {
  it('merges CI section for github forge', () => {
    const s = getGitForgePromptSection(githubCtx)
    expect(s).toContain('Git Safety Protocol')
    expect(s).toContain('Investigating CI failures')
  })
})

describe('buildInvestigateCiPrompt', () => {
  it('includes linked PR when provided', () => {
    const s = buildInvestigateCiPrompt(githubCtx, 'https://github.com/acme/app/pull/1')
    expect(s).toContain('Linked PR: https://github.com/acme/app/pull/1')
    expect(s).toContain('GitStatus')
  })
})

describe('isReadOnlyBashCommand CI', () => {
  it('gh run view is read-only', () => {
    expect(isReadOnlyBashCommand('gh run view 123 --log-failed')).toBe(true)
  })

  it('gh run list is read-only', () => {
    expect(isReadOnlyBashCommand('gh run list --limit 5')).toBe(true)
  })

  it('gh workflow view is read-only', () => {
    expect(isReadOnlyBashCommand('gh workflow view ci.yml')).toBe(true)
  })
})
