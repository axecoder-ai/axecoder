import { execSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterAll, beforeAll, describe, expect, it } from 'vitest'
import {
  runGitDiffForAgent,
  runGitLogForAgent,
  runGitStatusForAgent,
} from '../../../electron/main/git-forge/git-agent-read'

let tmpDir = ''

beforeAll(() => {
  tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axecoder-git-agent-'))
  execSync('git init -b main', { cwd: tmpDir, stdio: 'ignore' })
  execSync('git config user.email "t@test.com"', { cwd: tmpDir, stdio: 'ignore' })
  execSync('git config user.name "Test"', { cwd: tmpDir, stdio: 'ignore' })
  fs.writeFileSync(path.join(tmpDir, 'a.txt'), 'hello\n')
  execSync('git add a.txt', { cwd: tmpDir, stdio: 'ignore' })
  execSync('git commit -m "init"', { cwd: tmpDir, stdio: 'ignore' })
})

afterAll(() => {
  if (tmpDir) fs.rmSync(tmpDir, { recursive: true, force: true })
})

describe('git-agent-read', () => {
  it('GitStatus returns branch and clean tree after commit', async () => {
    const res = await runGitStatusForAgent(tmpDir)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.text).toContain('Branch: main')
      expect(res.text).toMatch(/clean|Changes/)
    }
  })

  it('GitLog returns oneline commits', async () => {
    const res = await runGitLogForAgent(tmpDir, { limit: 5 })
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.text).toContain('init')
  })

  it('GitDiff shows working tree change', async () => {
    fs.writeFileSync(path.join(tmpDir, 'a.txt'), 'hello world\n')
    const res = await runGitDiffForAgent(tmpDir)
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.text).toContain('hello')
  })
})
