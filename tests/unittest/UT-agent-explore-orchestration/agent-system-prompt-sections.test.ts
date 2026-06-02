import { describe, expect, it } from 'vitest'
import {
  getTodoManagementSection,
  getAgentDelegationSection,
  getFunctionResultClearingSection,
  EXPLORE_AGENT_MIN_QUERIES,
} from '../../../electron/main/agent/agent-system-prompt'

describe('agent-system-prompt explore sections', () => {
  it('Todo 段在启用 TodoWrite 时出现', () => {
    const s = getTodoManagementSection(new Set(['TodoWrite']))
    expect(s).toContain('TodoWrite')
    expect(s).toContain('completed')
  })

  it('Agent 段含 Explore 阈值', () => {
    const s = getAgentDelegationSection(new Set(['Agent', 'Grep', 'Glob']))
    expect(s).toContain('Agent')
    expect(s).toContain('explore')
    expect(s).toContain(String(EXPLORE_AGENT_MIN_QUERIES))
  })

  it('FRC 段含保留条数', () => {
    const s = getFunctionResultClearingSection(8)
    expect(s).toContain('8')
    expect(s).toContain('cleared')
  })
})
