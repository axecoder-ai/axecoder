import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { EventEmitter } from 'node:events'

vi.mock('electron', () => ({
  app: { getAppPath: () => process.cwd() },
}))

vi.mock('../../../electron/main/config-store', () => ({
  getConfig: vi.fn(async () => ({
    agentFeatureWebSearch: true,
    agentFeatureWebRun: true,
  })),
}))

const mockSpawn = vi.fn()
vi.mock('node:child_process', () => ({
  spawn: (...args: unknown[]) => mockSpawn(...args),
}))

import { webSearch, webSearchSerper, formatSerperResults, resolveWebSearchApiKey } from '../../../electron/main/agent/agent-web'
import { runWebRun, runBrowserSearch, resetBrowserBridgeForTests } from '../../../electron/main/agent/agent-browser-playwright'
import { executeExtendedAgentTool } from '../../../electron/main/agent/agent-ext-executor'
import { buildExtendedAgentTools } from '../../../electron/main/agent/agent-tool-prompts-ext'

const mockSearchResult = (stdout: EventEmitter, stdin: { write: ReturnType<typeof vi.fn> }) => {
  const written = stdin.write.mock.calls[0]?.[0] as string
  const msg = JSON.parse(written.trim())
  stdout.emit(
    'data',
    `${JSON.stringify({
      id: msg.id,
      ok: true,
      text: '1. Example\n   https://example.com\n   snippet',
    })}\n`,
  )
}

describe('web-search playwright', () => {
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

  it('webSearch 缺少 query 报错', async () => {
    const res = await webSearch('  ')
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.error).toContain('search_term')
  })

  it('webSearch 通过 Playwright search 子进程', async () => {
    const p = webSearch('hello world', { browserEnabled: true })
    await new Promise((r) => setTimeout(r, 5))
    mockSearchResult(stdout, stdin)
    const res = await p
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.text).toContain('Example')
    const written = stdin.write.mock.calls[0]?.[0] as string
    expect(written).toContain('"action":"search"')
    expect(written).toContain('hello world')
  })

  it('webSearch 有 Serper Key 时走云端', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({
        organic: [{ title: 'Cloud', link: 'https://cloud.test', snippet: 'sc' }],
      }),
    } as Response)
    const res = await webSearch('hello', { apiKey: 'sk-test', browserEnabled: false })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.text).toContain('Cloud')
    expect(fetchMock).toHaveBeenCalled()
    fetchMock.mockRestore()
  })

  it('webSearchSerper 与 resolveWebSearchApiKey', async () => {
    const prev = process.env.SERPER_API_KEY
    process.env.SERPER_API_KEY = 'env-key'
    try {
      expect(resolveWebSearchApiKey({ agentWebSearchApiKey: 'cfg' })).toBe('cfg')
      expect(resolveWebSearchApiKey({})).toBe('env-key')
      expect(formatSerperResults({ organic: [] })).toContain('No results')
    } finally {
      if (prev === undefined) delete process.env.SERPER_API_KEY
      else process.env.SERPER_API_KEY = prev
    }
    const bad = await webSearchSerper('q', '')
    expect(bad.ok).toBe(false)
  })

  it('runBrowserSearch 调 search action', async () => {
    const p = runBrowserSearch('vitest')
    await new Promise((r) => setTimeout(r, 5))
    mockSearchResult(stdout, stdin)
    const res = await p
    expect(res.ok).toBe(true)
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
      agentFeatureWebRun: false,
    } as never)
    const res = await executeExtendedAgentTool(
      { projectRoot: process.cwd(), readCache: new Set(), planMode: false },
      { id: 'w1', name: 'WebSearch', arguments: { search_term: 'x' } },
    )
    expect(res.log.ok).toBe(false)
    expect(res.content).toContain('unavailable')
  })

  it('WebSearch 仅 Serper Key 无浏览器也可用', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue({
      ok: true,
      json: async () => ({ organic: [{ title: 'S', link: 'https://s.test', snippet: '' }] }),
    } as Response)
    const { getConfig } = await import('../../../electron/main/config-store')
    vi.mocked(getConfig).mockResolvedValueOnce({
      agentFeatureWebSearch: false,
      agentFeatureWebRun: false,
      agentWebSearchApiKey: 'cloud-key',
    } as never)
    const res = await executeExtendedAgentTool(
      { projectRoot: process.cwd(), readCache: new Set(), planMode: false },
      { id: 'w4', name: 'WebSearch', arguments: { search_term: 'cloud only' } },
    )
    expect(res.log.ok).toBe(true)
    fetchMock.mockRestore()
  })

  it('WebSearch 启用时走 Playwright', async () => {
    resetBrowserBridgeForTests()
    const stdout = new EventEmitter()
    const stdin = { write: vi.fn(), end: vi.fn() }
    mockSpawn.mockReturnValue({
      stdout,
      stdin,
      stderr: new EventEmitter(),
      on: vi.fn(),
      kill: vi.fn(),
    })
    const { getConfig } = await import('../../../electron/main/config-store')
    vi.mocked(getConfig).mockResolvedValueOnce({
      agentFeatureWebSearch: false,
      agentFeatureWebRun: true,
    } as never)
    const p = executeExtendedAgentTool(
      { projectRoot: process.cwd(), readCache: new Set(), planMode: false },
      { id: 'w3', name: 'WebSearch', arguments: { search_term: 'playwright test' } },
    )
    await new Promise((r) => setTimeout(r, 5))
    mockSearchResult(stdout, stdin)
    const res = await p
    expect(res?.log.ok).toBe(true)
    resetBrowserBridgeForTests()
  })

  it('WebRun disabled 返回明确错误', async () => {
    const { getConfig } = await import('../../../electron/main/config-store')
    vi.mocked(getConfig).mockResolvedValueOnce({
      agentFeatureWebSearch: true,
      agentFeatureWebRun: false,
    } as never)
    const res = await executeExtendedAgentTool(
      { projectRoot: process.cwd(), readCache: new Set(), planMode: false },
      { id: 'w2', name: 'WebRun', arguments: { action: 'navigate', url: 'https://x.test' } },
    )
    expect(res.log.ok).toBe(false)
    expect(res.content).toContain('WebRun disabled')
  })
})
