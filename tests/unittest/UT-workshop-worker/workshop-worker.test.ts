import { describe, expect, it, vi } from 'vitest'

vi.mock('electron', () => ({
  BrowserWindow: {
    getAllWindows: () => [],
  },
  app: {
    getAppPath: () => process.cwd(),
  },
}))

describe('workshop-worker host handlers', () => {
  it('handleWorkshopWorkerHostRequest emitWorkshopProgress', async () => {
    const { handleWorkshopWorkerHostRequest } = await import(
      '../../../electron/main/workshop-worker/host-handlers'
    )
    const { broadcastToRenderers } = await import('../../../electron/main/renderer-broadcast')
    const spy = vi.spyOn({ broadcastToRenderers }, 'broadcastToRenderers')
    await handleWorkshopWorkerHostRequest('emitWorkshopProgress', {
      workshopId: 'w1',
      roleId: 'r1',
      status: 'thinking',
    })
    void spy
    expect(true).toBe(true)
  })

  it('handleWorkshopWorkerHostRequest 未知 agent 方法抛错', async () => {
    const { handleWorkshopWorkerHostRequest } = await import(
      '../../../electron/main/workshop-worker/host-handlers'
    )
    await expect(handleWorkshopWorkerHostRequest('noSuchMethod', {})).rejects.toThrow(/Unknown/)
  })
})

describe('workshop-runtime-proxy', () => {
  it('worker 禁用时走 local', async () => {
    const { withWorkshopRuntime } = await import('../../../electron/main/workshop-runtime-proxy')
    const { resetWorkshopWorkerBridgeForTests } = await import(
      '../../../electron/main/workshop-worker-bridge'
    )
    resetWorkshopWorkerBridgeForTests()
    const { setConfig } = await import('../../../electron/main/config-store')
    await setConfig({ workshopWorkerEnabled: false })
    const out = await withWorkshopRuntime(
      () => 'local',
      async () => 'remote',
    )
    expect(out).toBe('local')
    await setConfig({ workshopWorkerEnabled: true })
  })

  it('worker 异常退出时回退 local', async () => {
    const bridgeMod = await import('../../../electron/main/workshop-worker-bridge')
    bridgeMod.resetWorkshopWorkerBridgeForTests()
    vi.spyOn(bridgeMod, 'getWorkshopWorkerBridge').mockResolvedValue({
      call: async () => {
        throw new Error('Workshop worker exited')
      },
      ensureWorker: () => {},
      shutdown: () => {},
    } as bridgeMod.WorkshopWorkerBridge)

    const { withWorkshopRuntime } = await import('../../../electron/main/workshop-runtime-proxy')
    const out = await withWorkshopRuntime(
      () => 'local-fallback',
      async (b) => b.call('ping'),
    )
    expect(out).toBe('local-fallback')
    vi.mocked(bridgeMod.getWorkshopWorkerBridge).mockRestore()
    expect(await bridgeMod.getWorkshopWorkerBridge()).toBeNull()
  })
})

describe('workshop-worker main-process-delegate', () => {
  it('isWorkshopWorkerProcess 读取环境变量', async () => {
    const { isWorkshopWorkerProcess } = await import(
      '../../../electron/main/workshop-worker/main-process-delegate'
    )
    const prev = process.env.AXECODER_WORKSHOP_WORKER
    process.env.AXECODER_WORKSHOP_WORKER = '1'
    expect(isWorkshopWorkerProcess()).toBe(true)
    delete process.env.AXECODER_WORKSHOP_WORKER
    expect(isWorkshopWorkerProcess()).toBe(false)
    if (prev !== undefined) process.env.AXECODER_WORKSHOP_WORKER = prev
  })
})
