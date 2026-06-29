import { describe, expect, it } from 'vitest'
import { parsePorcelainLine } from '../../../electron/main/git-ipc'

describe('parsePorcelainLine', () => {
  it('parses unstaged worktree modification', () => {
    expect(parsePorcelainLine(' M electron/main/foo.ts')).toEqual({
      code: ' M',
      file: 'electron/main/foo.ts',
    })
  })

  it('parses staged-only change (path starts at index 2)', () => {
    expect(parsePorcelainLine('M  electron/main/foo.ts')).toEqual({
      code: 'M ',
      file: 'electron/main/foo.ts',
    })
  })

  it('parses untracked file', () => {
    expect(parsePorcelainLine('?? docs/readme.md')).toEqual({
      code: '??',
      file: 'docs/readme.md',
    })
  })

  it('parses rename', () => {
    expect(parsePorcelainLine('R  old.ts -> new.ts')).toEqual({
      code: 'R ',
      file: 'old.ts -> new.ts',
    })
  })
})
