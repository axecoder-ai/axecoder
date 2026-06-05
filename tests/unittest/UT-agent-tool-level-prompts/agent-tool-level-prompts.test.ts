import { describe, expect, it } from 'vitest'
import { AGENT_TOOLS, buildFullAgentTools } from '../../../electron/main/agent/agent-tool-defs'
import { ALL_AGENT_TOOL_NAMES } from '../../../electron/main/agent/agent-types'

const tool = (name: string) => AGENT_TOOLS.find((t) => t.name === name)!

describe('agent-tool-level-prompts', () => {
  it('buildFullAgentTools 与 AGENT_TOOLS 工具名一致', () => {
    const built = buildFullAgentTools().map((t) => t.name).sort()
    const names = AGENT_TOOLS.map((t) => t.name).sort()
    expect(built).toEqual(names)
    expect(names).toEqual([...ALL_AGENT_TOOL_NAMES].sort())
    expect(names.length).toBe(40)
  })

  it('strict：各工具 description 达到长文下限', () => {
    for (const t of AGENT_TOOLS) {
      const min = t.name === 'Bash' || t.name === 'Task' || t.name === 'Agent' ? 800 : 400
      expect(t.description.length, t.name).toBeGreaterThanOrEqual(min)
    }
  })

  it('Read：先读后改、相对路径', () => {
    const d = tool('Read').description
    expect(d).toMatch(/before.*Edit/i)
    expect(d).toMatch(/relative/i)
    expect(d).toMatch(/project root/i)
  })

  it('Edit：唯一匹配与 replace_all', () => {
    const d = tool('Edit').description
    expect(d).toMatch(/unique/i)
    expect(d).toMatch(/replace_all/i)
    expect(d).toMatch(/Read/i)
  })

  it('Bash：禁止替代 Read/Edit/Glob/Grep', () => {
    const d = tool('Bash').description
    expect(d).toMatch(/Do NOT use Bash/i)
    expect(d).toMatch(/`Read`/i)
    expect(d).toMatch(/cat/i)
    expect(d).toMatch(/sed/i)
    expect(d).toMatch(/find/i)
    expect(d).toMatch(/timeout/i)
  })

  it('Task：不可嵌套、需简洁报告', () => {
    const d = tool('Task').description
    expect(d).toMatch(/cannot spawn|Nested subagents/i)
    expect(d).toMatch(/concise report/i)
    expect(d).toMatch(/trivial/i)
  })

  it('AskUserQuestion：调查后再问', () => {
    const d = tool('AskUserQuestion').description
    expect(d).toMatch(/genuinely stuck/i)
    expect(d).toMatch(/not as a first response/i)
  })

  it('Glob / Grep：专用搜索而非 Bash', () => {
    expect(tool('Glob').description).toMatch(/Glob/i)
    expect(tool('Glob').description).toMatch(/find|ls/i)
    expect(tool('Grep').description).toMatch(/ripgrep|grep/i)
  })

  it('扩展工具已注册', () => {
    expect(tool('TodoWrite').name).toBe('TodoWrite')
    expect(tool('EnterPlanMode').name).toBe('EnterPlanMode')
    expect(tool('CallMcpTool').name).toBe('CallMcpTool')
    expect(tool('ToolSearch').name).toBe('ToolSearch')
  })
})
