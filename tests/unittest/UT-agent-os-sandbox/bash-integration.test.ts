import { describe, expect, it, vi } from 'vitest'

describe('tool-executor execpolicy deny', () => {
  it('execpolicy deny 时立即返回而非 bash_pending', async () => {
    vi.doMock('../../../electron/main/agent/agent-execpolicy', () => ({
      evaluateExecPolicy: () => ({ kind: 'deny', reason: 'execpolicy denied by test: rm -rf /' }),
      loadExecPolicy: () => null,
      parseExecPolicyToml: () => ({ rules: {} }),
      defaultExecPolicyPath: () => '',
      formatExecPolicyBlock: () => '',
    }))
    const { executeAgentTool } = await import('../../../electron/main/agent/tool-executor')
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
    vi.doUnmock('../../../electron/main/agent/agent-execpolicy')
  })
})
