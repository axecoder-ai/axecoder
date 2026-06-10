import { describe, expect, it, vi, beforeEach } from 'vitest'
import { applyTextEdits } from '../../../electron/main/lsp/lsp-workspace-edit'
import { executeExtendedAgentTool } from '../../../electron/main/agent/agent-ext-executor'
import { buildFullAgentTools } from '../../../electron/main/agent/agent-tool-registry'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

vi.mock('../../../electron/main/config-store', () => ({
  getConfig: vi.fn(async () => ({ agentFeatureLsp: true })),
}))

const mockSendRequest = vi.fn()
const mockOpenFile = vi.fn()
const mockIsFileOpen = vi.fn(() => false)

vi.mock('../../../electron/main/lsp/lsp-manager', () => ({
  ensureLspForProject: vi.fn(async () => {}),
  getInitializationStatus: vi.fn(() => 'success'),
  waitForInitialization: vi.fn(async () => {}),
  getLspServerManager: vi.fn(() => ({
    isFileOpen: mockIsFileOpen,
    openFile: mockOpenFile,
    sendRequest: mockSendRequest,
  })),
}))

describe('fix-lints-tool', () => {
  beforeEach(() => {
    mockSendRequest.mockReset()
    mockOpenFile.mockReset()
    mockIsFileOpen.mockReset()
    mockIsFileOpen.mockReturnValue(false)
  })

  it('applyTextEdits 单行替换', () => {
    const content = 'const x: number = "bad"\n'
    const next = applyTextEdits(content, [
      {
        range: { start: { line: 0, character: 18 }, end: { line: 0, character: 23 } },
        newText: '42',
      },
    ])
    expect(next).toBe('const x: number = 42\n')
  })

  it('buildFullAgentTools 包含 FixLints', () => {
    expect(buildFullAgentTools().map((t) => t.name)).toContain('FixLints')
  })

  it('executeExtendedAgentTool FixLints 应用 codeAction 并验证', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'axecoder-fixlints-'))
    const filePath = path.join(tmp, 'sample.ts')
    await fs.writeFile(filePath, 'const x: number = "bad"\n')

    mockSendRequest.mockImplementation(async (_fp: string, method: string) => {
      if (method === 'textDocument/diagnostic') {
        return {
          kind: 'full',
          items: [
            {
              range: { start: { line: 0, character: 18 }, end: { line: 0, character: 23 } },
              severity: 1,
              message: 'type error',
            },
          ],
        }
      }
      if (method === 'textDocument/codeAction') {
        return [
          {
            title: 'Fix to 42',
            kind: 'quickfix',
            edit: {
              changes: {
                [`file://${filePath}`]: [
                  {
                    range: { start: { line: 0, character: 18 }, end: { line: 0, character: 23 } },
                    newText: '42',
                  },
                ],
              },
            },
          },
        ]
      }
      return null
    })

    const ctx = { projectRoot: tmp, readCache: new Set<string>(), planMode: false }
    const res = await executeExtendedAgentTool(ctx, {
      id: 'fl1',
      name: 'FixLints',
      arguments: { paths: ['sample.ts'] },
    })

    expect(res?.log.ok).toBe(true)
    expect(res?.content).toContain('FixLints complete')
    const saved = await fs.readFile(filePath, 'utf-8')
    expect(saved).toBe('const x: number = 42\n')
    await fs.rm(tmp, { recursive: true, force: true })
  })

  it('executeExtendedAgentTool FixLints plan 模式拒绝', async () => {
    const ctx = { projectRoot: process.cwd(), readCache: new Set<string>(), planMode: true }
    const res = await executeExtendedAgentTool(ctx, {
      id: 'fl2',
      name: 'FixLints',
      arguments: { paths: ['a.ts'] },
    })
    expect(res?.log.ok).toBe(false)
    expect(res?.content).toContain('Plan mode')
  })
})
