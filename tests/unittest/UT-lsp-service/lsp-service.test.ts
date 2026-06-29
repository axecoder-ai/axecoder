import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { setAxecoderDirForTests } from '../../../electron/main/axecoder-dir'
import { loadLspConfig } from '../../../electron/main/lsp/lsp-config'
import { resetExtensionHostBridgeForTests } from '../../../electron/main/extension-host-bridge'
import {
  getInitializationStatus,
  shutdownLspServerManager,
} from '../../../electron/main/lsp/lsp-manager'

vi.mock('../../../electron/main/extension-host-bridge', async (importOriginal) => {
  const orig = await importOriginal<typeof import('../../../electron/main/extension-host-bridge')>()
  return {
    ...orig,
    isExtensionHostLspEnabled: vi.fn(async () => false),
    getExtensionHostBridge: vi.fn(async () => null),
  }
})

describe('lsp-service', () => {
  afterEach(async () => {
    await shutdownLspServerManager()
    resetExtensionHostBridgeForTests()
  })

  it('loadLspConfig 用户 lsp.json 覆盖扩展发现', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'axecoder-lsp-svc-'))
    setAxecoderDirForTests(tmp)
    await fs.writeFile(
      path.join(tmp, 'lsp.json'),
      JSON.stringify({
        servers: {
          custom: {
            command: 'echo',
            extensionToLanguage: { '.xyz': 'plaintext' },
          },
        },
      }),
    )
    const cfg = await loadLspConfig(process.cwd())
    expect(cfg.servers.custom?.command).toBe('echo')
  })

  it('extensionHost 禁用时 getInitializationStatus 初始为 not-started', () => {
    expect(getInitializationStatus()).toBe('not-started')
  })
})
