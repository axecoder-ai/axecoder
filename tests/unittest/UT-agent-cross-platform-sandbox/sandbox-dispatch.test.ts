import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { buildShellSpawnSpec, detectSandboxDenial } from '../../../electron/main/agent/agent-sandbox'
import { BWRAP_PATH } from '../../../electron/main/agent/agent-sandbox-bwrap'
import { SANDBOX_EXEC_PATH } from '../../../electron/main/agent/agent-sandbox-seatbelt'

describe('Sandbox platform dispatch', () => {
  let tmpDir = ''

  afterEach(async () => {
    vi.unstubAllGlobals()
    if (tmpDir && fs.existsSync(tmpDir)) {
      await fs.promises.rm(tmpDir, { recursive: true, force: true })
      tmpDir = ''
    }
  })

  it('enabled=false 时不包装', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axecoder-sb-dispatch-'))
    const spec = buildShellSpawnSpec(tmpDir, 'echo hi', { enabled: false })
    expect(spec.sandboxed).toBe(false)
    expect(spec.sandboxKind).toBe('none')
    expect(spec.program).not.toBe(SANDBOX_EXEC_PATH)
    expect(spec.program).not.toBe(BWRAP_PATH)
  })

  it('danger-full-access 不包装', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axecoder-sb-dispatch-'))
    const spec = buildShellSpawnSpec(tmpDir, 'echo hi', { mode: 'danger-full-access' })
    expect(spec.sandboxed).toBe(false)
    expect(spec.sandboxKind).toBe('none')
  })

  it('win32 平台不包装 OS 沙箱', () => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'axecoder-sb-dispatch-'))
    vi.stubGlobal('process', { ...process, platform: 'win32' })
    const spec = buildShellSpawnSpec(tmpDir, 'echo hi', { enabled: true })
    expect(spec.sandboxed).toBe(false)
    expect(spec.sandboxKind).toBe('none')
  })

  it('detectSandboxDenial 按 kind 分发', () => {
    expect(detectSandboxDenial(1, 'Sandbox: git(123) deny(1) file-write-data /tmp/x denied', 'seatbelt')).toBe(true)
    expect(detectSandboxDenial(1, 'Permission denied', 'bwrap')).toBe(true)
    expect(detectSandboxDenial(0, '', 'none')).toBe(false)
  })
})
