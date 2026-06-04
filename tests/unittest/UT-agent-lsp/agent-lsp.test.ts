import { describe, expect, it } from 'vitest'
import { parseLspToolInput } from '../../../electron/main/agent/agent-lsp'
import { loadLspConfig } from '../../../electron/main/lsp/lsp-config'
import { setAxecoderDirForTests } from '../../../electron/main/axecoder-dir'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

describe('agent-lsp', () => {
  it('parseLspToolInput 接受 filePath 与 9 种 operation', () => {
    const res = parseLspToolInput({
      operation: 'goToDefinition',
      filePath: 'src/App.vue',
      line: 1,
      character: 1,
    })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.input.operation).toBe('goToDefinition')
      expect(res.input.filePath).toBe('src/App.vue')
    }
  })

  it('parseLspToolInput 兼容 file_path 别名', () => {
    const res = parseLspToolInput({
      operation: 'findReferences',
      file_path: 'a.ts',
      line: 2,
      character: 3,
    })
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.input.filePath).toBe('a.ts')
  })

  it('parseLspToolInput 拒绝非法 operation', () => {
    const res = parseLspToolInput({
      operation: 'rename',
      filePath: 'a.ts',
      line: 1,
      character: 1,
    })
    expect(res.ok).toBe(false)
  })

  it('loadLspConfig 合并用户 lsp.json', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'axecoder-lsp-'))
    setAxecoderDirForTests(tmp)
    await fs.writeFile(
      path.join(tmp, 'lsp.json'),
      JSON.stringify({
        servers: {
          test: {
            command: 'echo',
            extensionToLanguage: { '.ts': 'typescript' },
          },
        },
      }),
    )
    const cfg = await loadLspConfig(process.cwd())
    expect(cfg.servers.test?.command).toBe('echo')
    setAxecoderDirForTests(null)
    await fs.rm(tmp, { recursive: true, force: true })
  })
})
