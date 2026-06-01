import { describe, expect, it } from 'vitest'
import {
  AGENT_TOOLS,
  buildAgentSystemPrompt,
  getSimpleIntroSection,
} from '../../../electron/main/agent/agent-tool-defs'

describe('agent-tool-defs search-first', () => {
  it('注册 Glob 工具', () => {
    const names = AGENT_TOOLS.map((t) => t.name)
    expect(names).toContain('Glob')
  })

  it('系统提示要求 Glob/Grep 优先且含 intro', async () => {
    const prompt = await buildAgentSystemPrompt('/proj/BIAOSHU', { skipProjectMemory: true })
    expect(prompt).toContain(getSimpleIntroSection())
    expect(prompt).toMatch(/Glob/i)
    expect(prompt).toMatch(/Grep/i)
    expect(prompt).not.toMatch(/assume.*full.*file/i)
  })
})
