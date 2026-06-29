import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: () => [],
  },
  app: {
    getAppPath: () => process.cwd(),
  },
}))
import {
  parseAgentWorkerLine,
  serializeAgentWorkerLine,
} from '../../../electron/main/agent-worker/protocol'

describe('agent-worker protocol', () => {
  it('parseAgentWorkerLine 解析 req/res', () => {
    const req = parseAgentWorkerLine('{"type":"req","id":1,"method":"ping"}')
    expect(req).toEqual({ type: 'req', id: 1, method: 'ping' })
    const res = parseAgentWorkerLine('{"type":"res","id":1,"ok":true,"result":{"pong":true}}')
    expect(res).toMatchObject({ type: 'res', id: 1, ok: true })
  })

  it('parseAgentWorkerLine 忽略空行与畸形 JSON', () => {
    expect(parseAgentWorkerLine('')).toBeNull()
    expect(parseAgentWorkerLine('not-json')).toBeNull()
    expect(parseAgentWorkerLine('{"type":"unknown"}')).toBeNull()
  })

  it('serializeAgentWorkerLine 以换行结尾', () => {
    const line = serializeAgentWorkerLine({ type: 'notify', channel: 'test', payload: { a: 1 } })
    expect(line.endsWith('\n')).toBe(true)
    expect(parseAgentWorkerLine(line.trim())).toMatchObject({ type: 'notify', channel: 'test' })
  })
})

describe('agent-worker host handlers', () => {
  it('handleAgentWorkerHostRequest 未知方法抛错', async () => {
    const { handleAgentWorkerHostRequest } = await import(
      '../../../electron/main/agent-worker/host-handlers'
    )
    await expect(handleAgentWorkerHostRequest('noSuchMethod', {})).rejects.toThrow(/Unknown/)
  })
})

describe('main-process-delegate', () => {
  it('isAgentWorkerProcess 读取环境变量', async () => {
    const { isAgentWorkerProcess } = await import(
      '../../../electron/main/agent/main-process-delegate'
    )
    const prev = process.env.AXECODER_AGENT_WORKER
    process.env.AXECODER_AGENT_WORKER = '1'
    expect(isAgentWorkerProcess()).toBe(true)
    delete process.env.AXECODER_AGENT_WORKER
    expect(isAgentWorkerProcess()).toBe(false)
    if (prev !== undefined) process.env.AXECODER_AGENT_WORKER = prev
  })
})

describe('agent-runtime-proxy', () => {
  it('withAgentRuntime worker 禁用时走 local', async () => {
    const { withAgentRuntime } = await import('../../../electron/main/agent-runtime-proxy')
    const { resetAgentWorkerBridgeForTests } = await import(
      '../../../electron/main/agent-worker-bridge'
    )
    resetAgentWorkerBridgeForTests()
    const { setConfig } = await import('../../../electron/main/config-store')
    await setConfig({ agentWorkerEnabled: false })
    const out = await withAgentRuntime(
      () => 'local',
      async () => 'remote',
    )
    expect(out).toBe('local')
    await setConfig({ agentWorkerEnabled: true })
  })
})
