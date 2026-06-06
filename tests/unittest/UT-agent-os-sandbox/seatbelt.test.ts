import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  createSeatbeltArgs,
  generateSeatbeltPolicy,
  getWritableRoots,
} from '../../../electron/main/agent/agent-sandbox-seatbelt'

describe('Seatbelt policy generation', () => {
  let tmpDir = ''

  afterEach(async () => {
    if (tmpDir && fs.existsSync(tmpDir)) {
      await fs.promises.rm(tmpDir, { recursive: true, force: true })
      tmpDir = ''
    }
  })

  it('workspace-write 含 file-read 与 writable root', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axecoder-sb-'))
    const policy = generateSeatbeltPolicy(tmpDir, 'workspace-write', false)
    expect(policy).toContain('(allow file-read*)')
    expect(policy).toContain('WRITABLE_ROOT_0')
    expect(policy).not.toContain('network-outbound')
  })

  it('含 cargo/npm cache 例外块', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axecoder-sb-'))
    const policy = generateSeatbeltPolicy(tmpDir, 'workspace-write', false)
    if (process.env.HOME) {
      expect(policy).toMatch(/CARGO_HOME|npm cache/)
    }
  })

  it('createSeatbeltArgs 以 sandbox-exec 与 -- 分隔', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axecoder-sb-'))
    const args = createSeatbeltArgs('/bin/sh', ['-lc', 'echo hi'], tmpDir)
    expect(args[0]).toBe('-p')
    expect(args).toContain('--')
    expect(args[args.length - 2]).toBe('-lc')
    expect(args[args.length - 1]).toBe('echo hi')
  })

  it('writable roots 保护 .axecoder 子目录只读', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axecoder-sb-'))
    const axDir = path.join(tmpDir, '.axecoder')
    fs.mkdirSync(axDir)
    const roots = getWritableRoots(tmpDir, 'workspace-write')
    expect(roots.some((r) => r.readOnlySubpaths.some((s) => s.endsWith('.axecoder')))).toBe(true)
  })
})
