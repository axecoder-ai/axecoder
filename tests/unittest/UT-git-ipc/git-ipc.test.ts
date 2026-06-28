import { describe, expect, it } from 'vitest'
import { runGit } from '../../../electron/main/git-ipc'

describe('git-ipc runGit', () => {
  it('returns branch name in a git repo', async () => {
    const branch = await runGit(process.cwd(), ['rev-parse', '--abbrev-ref', 'HEAD'])
    expect(typeof branch).toBe('string')
    expect(branch.length).toBeGreaterThan(0)
  })

  it('rejects invalid git args', async () => {
    await expect(runGit(process.cwd(), ['not-a-real-subcommand-xyz'])).rejects.toThrow()
  })
})
