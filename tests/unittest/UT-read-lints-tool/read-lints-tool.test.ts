import { describe, expect, it, vi, beforeEach } from 'vitest'
import { formatDiagnosticsResult } from '../../../electron/main/lsp/lsp-formatters'
import { parseReadLintsInput } from '../../../electron/main/agent/agent-read-lints'
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

describe('read-lints-tool', () => {
  beforeEach(() => {
    mockSendRequest.mockReset()
    mockOpenFile.mockReset()
    mockIsFileOpen.mockReset()
    mockIsFileOpen.mockReturnValue(false)
  })

  it('parseReadLintsInput 接受 paths 数组', () => {
    const res = parseReadLintsInput({ paths: ['src/a.ts', 'src/b.ts'] })
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.input.paths).toEqual(['src/a.ts', 'src/b.ts'])
  })

  it('parseReadLintsInput 接受单个 path 字符串', () => {
    const res = parseReadLintsInput({ path: 'foo.ts' })
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.input.paths).toEqual(['foo.ts'])
  })

  it('parseReadLintsInput 省略 paths 表示自动发现', () => {
    const res = parseReadLintsInput({})
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.input.paths).toEqual([])
  })

  it('formatDiagnosticsResult 格式化 severity 与 source', () => {
    const text = formatDiagnosticsResult('src/x.ts', [
      {
        range: { start: { line: 9, character: 4 }, end: { line: 9, character: 10 } },
        severity: 1,
        code: 'TS2322',
        source: 'typescript',
        message: "Type 'string' is not assignable to type 'number'.",
      },
    ])
    expect(text).toContain('src/x.ts:10:5 error TS2322')
    expect(text).toContain('typescript')
  })

  it('formatDiagnosticsResult 无诊断时返回 clean 消息', () => {
    expect(formatDiagnosticsResult('a.ts', [])).toBe('a.ts: No linter errors found.')
  })

  it('buildFullAgentTools 包含 ReadLints', () => {
    const names = buildFullAgentTools().map((t) => t.name)
    expect(names).toContain('ReadLints')
  })

  it('executeExtendedAgentTool ReadLints 拉取 LSP 诊断', async () => {
    const tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'axecoder-readlints-'))
    const filePath = path.join(tmp, 'sample.ts')
    await fs.writeFile(filePath, 'const x: number = "bad"\n')

    mockSendRequest.mockResolvedValue({
      kind: 'full',
      items: [
        {
          range: { start: { line: 0, character: 6 }, end: { line: 0, character: 7 } },
          severity: 1,
          message: 'type error',
          source: 'tsserver',
        },
      ],
    })

    const ctx = { projectRoot: tmp, readCache: new Set<string>(), planMode: false }
    const res = await executeExtendedAgentTool(ctx, {
      id: 'rl1',
      name: 'ReadLints',
      arguments: { paths: ['sample.ts'] },
    })

    expect(res?.log.ok).toBe(true)
    expect(res?.content).toContain('sample.ts:1:7 error')
    expect(res?.content).toContain('type error')
    expect(mockOpenFile).toHaveBeenCalled()
    await fs.rm(tmp, { recursive: true, force: true })
  })
})
