import { describe, expect, it } from 'vitest'
import { executeAgentTool } from '../../../electron/main/agent/tool-executor'

describe('executeAgentTool Edit', () => {
  it('未 Read 时 Edit 失败', async () => {
    const ctx = { projectRoot: '/proj', readCache: new Set<string>() }
    const res = await executeAgentTool(ctx, {
      id: 'tc1',
      name: 'Edit',
      arguments: {
        file_path: '/proj/a.md',
        old_string: 'x',
        new_string: 'y',
      },
    })
    expect(res.kind).toBe('immediate')
    if (res.kind === 'immediate') {
      expect(res.log.ok).toBe(false)
      expect(res.content).toContain('Read')
    }
  })
})
