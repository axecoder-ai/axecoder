import { describe, expect, it, vi, beforeEach } from 'vitest'
import { buildPostEditDiagnosticsBlock } from '../../../electron/main/agent/agent-lsp-post-edit'
import { syncAgentFileToLsp, resetAgentLspDocVersions } from '../../../electron/main/lsp/lsp-agent-sync'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

const mockGetConfig = vi.fn()
const mockFetchFileDiagnostics = vi.fn()
const mockEnsureLsp = vi.fn()
const mockOpenFile = vi.fn()
const mockChangeFile = vi.fn()
const mockIsFileOpen = vi.fn()

vi.mock('../../../electron/main/config-store', () => ({
  getConfig: () => mockGetConfig(),
}))

vi.mock('../../../electron/main/agent/agent-read-lints', () => ({
  fetchFileDiagnostics: (...args: unknown[]) => mockFetchFileDiagnostics(...args),
}))

vi.mock('../../../electron/main/lsp/lsp-manager', () => ({
  ensureLspForProject: (...args: unknown[]) => mockEnsureLsp(...args),
  getLspServerManager: () => ({
    isFileOpen: mockIsFileOpen,
    openFile: mockOpenFile,
    changeFile: mockChangeFile,
  }),
}))

describe('agent-lsp-post-edit', () => {
  beforeEach(() => {
    mockGetConfig.mockReset()
    mockFetchFileDiagnostics.mockReset()
    mockEnsureLsp.mockReset()
    mockOpenFile.mockReset()
    mockChangeFile.mockReset()
    mockIsFileOpen.mockReset()
    resetAgentLspDocVersions()
    mockGetConfig.mockResolvedValue({ agentFeatureLsp: true, agentLspAutoDiagnostics: true })
    mockEnsureLsp.mockResolvedValue(undefined)
    mockIsFileOpen.mockReturnValue(false)
    mockOpenFile.mockResolvedValue(undefined)
  })

  it('agentFeatureLsp 关闭时不追加诊断', async () => {
    mockGetConfig.mockResolvedValue({ agentFeatureLsp: false, agentLspAutoDiagnostics: true })
    const block = await buildPostEditDiagnosticsBlock('/proj', ['/proj/a.ts'])
    expect(block).toBe('')
    expect(mockFetchFileDiagnostics).not.toHaveBeenCalled()
  })

  it('agentLspAutoDiagnostics 关闭时不追加诊断', async () => {
    mockGetConfig.mockResolvedValue({ agentFeatureLsp: true, agentLspAutoDiagnostics: false })
    const block = await buildPostEditDiagnosticsBlock('/proj', ['/proj/a.ts'])
    expect(block).toBe('')
  })

  it('有 error 诊断时追加块', async () => {
    mockFetchFileDiagnostics.mockResolvedValue({
      ok: true,
      diagnostics: [
        {
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
          message: 'Type error',
          severity: 1,
        },
      ],
    })
    const block = await buildPostEditDiagnosticsBlock('/proj', ['/proj/src/a.ts'])
    expect(block).toContain('--- LSP diagnostics ---')
    expect(block).toContain('error')
    expect(block).toContain('Type error')
  })

  it('仅 hint/info 时不追加', async () => {
    mockFetchFileDiagnostics.mockResolvedValue({
      ok: true,
      diagnostics: [
        {
          range: { start: { line: 0, character: 0 }, end: { line: 0, character: 1 } },
          message: 'fyi',
          severity: 3,
        },
      ],
    })
    const block = await buildPostEditDiagnosticsBlock('/proj', ['/proj/a.ts'])
    expect(block).toBe('')
  })
})

describe('lsp-agent-sync', () => {
  let tmp = ''

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'lsp-sync-'))
    resetAgentLspDocVersions()
    mockEnsureLsp.mockReset()
    mockOpenFile.mockReset()
    mockChangeFile.mockReset()
    mockIsFileOpen.mockReset()
    mockEnsureLsp.mockResolvedValue(undefined)
  })

  it('未打开文件时 openFile', async () => {
    const file = path.join(tmp, 'a.ts')
    await fs.writeFile(file, 'const x = 1', 'utf-8')
    mockIsFileOpen.mockReturnValue(false)
    await syncAgentFileToLsp(tmp, file)
    expect(mockOpenFile).toHaveBeenCalled()
    expect(mockChangeFile).not.toHaveBeenCalled()
  })

  it('已打开文件时 changeFile', async () => {
    const file = path.join(tmp, 'b.ts')
    await fs.writeFile(file, 'const y = 2', 'utf-8')
    mockIsFileOpen.mockReturnValue(true)
    await syncAgentFileToLsp(tmp, file)
    expect(mockChangeFile).toHaveBeenCalled()
  })
})
