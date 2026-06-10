import { describe, expect, it, vi } from 'vitest'

vi.mock('../../../electron/main/config-store', () => ({
  getConfig: vi.fn(async () => ({ agentOsSandboxEnabled: true })),
}))

vi.mock('../../../electron/main/agent/agent-execpolicy', () => ({
  evaluateExecPolicy: () => ({ kind: 'deny', reason: 'execpolicy denied by test: rm -rf /' }),
  loadExecPolicy: () => null,
  parseExecPolicyToml: () => ({ rules: {} }),
  defaultExecPolicyPath: () => '',
  formatExecPolicyBlock: () => '',
}))

import { executeAgentTool } from '../../../electron/main/agent/tool-executor'

describe('tool-executor execpolicy deny', () => {
  it('execpolicy deny 时立即返回而非 bash_pending', async () => {
    const ctx = { projectRoot: '/tmp', readCache: new Set<string>() }
    const run = await executeAgentTool(ctx, {
      id: 'tc-deny',
      name: 'Bash',
      arguments: { command: 'rm -rf /' },
    })
    expect(run.kind).toBe('immediate')
    if (run.kind === 'immediate') {
      expect(run.content).toContain('BLOCKED')
      expect(run.log.ok).toBe(false)
    }
  })
})
