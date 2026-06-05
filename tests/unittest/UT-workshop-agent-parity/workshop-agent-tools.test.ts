import { describe, expect, it } from 'vitest'
import { buildFullAgentTools } from '../../../electron/main/agent/agent-tool-registry'
import { getSessionActiveTools } from '../../../electron/main/agent/agent-ext-executor'

describe('workshop agent tools parity', () => {
  it('默认可见工具含 CodeGraph（与 Agent 模式一致）', () => {
    const active = getSessionActiveTools(buildFullAgentTools(), new Set())
    const names = active.map((t) => t.name)
    expect(names).toContain('CodeGraphExplore')
    expect(names).toContain('CodeGraphSearch')
    expect(names).toContain('CodeGraphNode')
    expect(names).toContain('Read')
    expect(names).toContain('Grep')
  })
})
