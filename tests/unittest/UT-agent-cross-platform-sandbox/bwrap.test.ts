import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { BWRAP_PATH, createBwrapArgs, detectBwrapDenial } from '../../../electron/main/agent/agent-sandbox-bwrap'

describe('Linux bwrap sandbox', () => {
  let tmpDir = ''

  afterEach(async () => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      await fs.promises.rm(tmpDir, { recursive: true, force: true })
      tmpDir = ''
    }
  })

  it('workspace-write 含 ro-bind 与 cwd bind', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axecoder-bwrap-'))
    const args = createBwrapArgs('/bin/sh', ['-lc', 'echo hi'], tmpDir, 'workspace-write')
    expect(args[0]).toBe('--ro-bind')
    expect(args).toContain('--bind')
    expect(args).toContain(tmpDir)
    expect(args).toContain('--chdir')
    expect(args).toContain('--unshare-all')
    expect(args).toContain('--')
    expect(args[args.length - 1]).toBe('echo hi')
  })

  it('read-only 不含 cwd write bind', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axecoder-bwrap-'))
    const args = createBwrapArgs('/bin/sh', ['-lc', 'echo hi'], tmpDir, 'read-only')
    expect(args).toContain('--ro-bind')
    expect(args).not.toContain('--bind')
    expect(args).toContain('--chdir')
  })

  it('detectBwrapDenial 识别 Permission denied', () => {
    expect(detectBwrapDenial(1, 'touch: cannot touch /etc/foo: Permission denied')).toBe(true)
    expect(detectBwrapDenial(0, '')).toBe(false)
  })

  it('BWRAP_PATH 常量', () => {
    expect(BWRAP_PATH).toBe('/usr/bin/bwrap')
  })
})
