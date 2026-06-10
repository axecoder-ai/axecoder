import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'node:events'

vi.mock('electron', () => ({
  app: { getAppPath: () => process.cwd() },
}))

vi.mock('../../../electron/main/config-store', () => ({
  getConfig: vi.fn(async () => ({
    agentFeatureWebSearch: true,
    agentWebSearchApiKey: 'test-serper-key',
    agentFeatureWebRun: true,
  })),
}))

const mockSpawn = vi.fn()
vi.mock('node:child_process', () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
}))

import { webSearch, formatSerperResults } from '../../../electron/main/agent/agent-web'
import { runWebRun, resetBrowserBridgeForTests } from '../../../electron/main/agent/agent-browser-playwright'
import { executeExtendedAgentTool } from '../../../electron/main/agent/agent-ext-executor'
import { buildExtendedAgentTools } from '../../../electron/main/agent/agent-tool-prompts-ext'

describe('web-search', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('webSearch 缺少 query 报错', async () => {
    const res = await webSearch('  ', 'key')
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.error).toContain('search_term')
  })

  it('webSearch 缺少 api key 报错', async () => {
    const res = await webSearch('hello', '')
    expect(res.ok).toBe(false)
  })

  it('webSearch 调 Serper 并格式化结果', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        organic: [{ title: 'A', link: 'https://a.test', snippet: 'sa' }],
      }),
    } as Response)

    const res = await webSearch('hello world', 'sk-test')
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.text).toContain('A')
    expect(res.text).toContain('https://a.test')
    expect(fetchMock).toHaveBeenCalledWith(
      'https://google.serper.dev/search',
      expect.objectContaining({
        method: 'POST',
        headers: expect.objectContaining({ 'X-API-KEY': 'sk-test' }),
      }),
    )
  })

  it('formatSerperResults 处理空 organic', () => {
    expect(formatSerperResults({ organic: [] })).toContain('No results')
  })
})

describe('web-run playwright bridge', () => {
  let stdout: EventEmitter
  let stdin: { write: ReturnType<typeof vi.fn>; end: ReturnType<typeof vi.fn> }

  beforeEach(() => {
    resetBrowserBridgeForTests()
    stdout = new EventEmitter()
    stdin = { write: vi.fn(), end: vi.fn() }
    mockSpawn.mockReturnValue({
      stdout,
      stdin,
      stderr: new EventEmitter(),
      on: vi.fn(),
      kill: vi.fn(),
    })
  })

  afterEach(() => {
    resetBrowserBridgeForTests()
  })

  it('runWebRun navigate 通过子进程协议', async () => {
    const p = runWebRun({ action: 'navigate', url: 'https://example.com' })
    await new Promise((r) => setTimeout(r, 5))
    const written = stdin.write.mock.calls[0]?.[0] as string
    expect(written).toContain('"action":"navigate"')
    const msg = JSON.parse(written.trim())
    stdout.emit('data', `${JSON.stringify({ id: msg.id, ok: true, text: 'navigated' })}\n`)
    const res = await p
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.text).toBe('navigated')
  })

  it('runWebRun 未知 action 报错', async () => {
    const res = await runWebRun({ action: 'fly' })
    expect(res.ok).toBe(false)
  })
})

describe('web tools registry', () => {
  it('扩展工具含 WebSearch 与 WebRun', () => {
    const names = buildExtendedAgentTools().map((t) => t.name)
    expect(names).toContain('WebSearch')
    expect(names).toContain('WebRun')
  })
})

describe('executor web tools', () => {
  it('WebSearch disabled 返回明确错误', async () => {
    const { getConfig } = await import('../../../electron/main/config-store')
    vi.mocked(getConfig).mockResolvedValueOnce({
      agentFeatureWebSearch: false,
      agentWebSearchApiKey: '',
      agentFeatureWebRun: false,
    } as never)
    const res = await executeExtendedAgentTool(
      { projectRoot: process.cwd(), readCache: new Set(), planMode: false },
      { id: 'w1', name: 'WebSearch', args: { search_term: 'x' } },
    )
    expect(res.log.ok).toBe(false)
    expect(res.content).toContain('disabled')
  })

  it('WebRun disabled 返回明确错误', async () => {
    const { getConfig } = await import('../../../electron/main/config-store')
    vi.mocked(getConfig).mockResolvedValueOnce({
      agentFeatureWebSearch: true,
      agentWebSearchApiKey: 'k',
      agentFeatureWebRun: false,
    } as never)
    const res = await executeExtendedAgentTool(
      { projectRoot: process.cwd(), readCache: new Set(), planMode: false },
      { id: 'w2', name: 'WebRun', args: { action: 'navigate', url: 'https://x.test' } },
    )
    expect(res.log.ok).toBe(false)
    expect(res.content).toContain('WebRun disabled')
  })
})
