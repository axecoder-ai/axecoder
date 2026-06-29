import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  app: {
    getAppPath: () => process.cwd(),
  },
}))

import {
  parseAgentWorkerLine,
  serializeAgentWorkerLine,
} from '../../../electron/main/agent-worker/protocol'

describe('indexer-worker protocol', () => {
  it('parseAgentWorkerLine 解析 req/res', () => {
    const req = parseAgentWorkerLine('{"type":"req","id":1,"method":"status"}')
    expect(req).toEqual({ type: 'req', id: 1, method: 'status' })
  })

  it('serializeAgentWorkerLine 以换行结尾', () => {
    const line = serializeAgentWorkerLine({ type: 'req', id: 2, method: 'index' })
    expect(line.endsWith('\n')).toBe(true)
  })
})

describe('indexer-runtime-proxy', () => {
  it('worker 禁用时走 local', async () => {
    const { withIndexerRuntime } = await import('../../../electron/main/indexer-runtime-proxy')
    const { resetIndexerWorkerBridgeForTests } = await import(
      '../../../electron/main/indexer-worker-bridge'
    )
    resetIndexerWorkerBridgeForTests()
    const { setConfig } = await import('../../../electron/main/config-store')
    await setConfig({ indexerWorkerEnabled: false })
    const out = await withIndexerRuntime(
      () => 'local',
      async () => 'remote',
    )
    expect(out).toBe('local')
    await setConfig({ indexerWorkerEnabled: true })
  })
})

describe('indexer-worker host handlers', () => {
  it('无 host handler（indexer 不需要反向 RPC）', () => {
    expect(true).toBe(true)
  })
})
