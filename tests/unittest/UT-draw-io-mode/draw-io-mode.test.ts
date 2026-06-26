import { describe, expect, it } from 'vitest'
import { applyDrawIoSearchReplaceEdits } from '../../../electron/main/draw-io/draw-io-xml'
import { DEFAULT_DRAW_IO_XML } from '../../../electron/main/draw-io/draw-io-defaults'
import {
  chatModeSystemAddon,
  DRAW_IO_TOOL_NAMES,
  filterToolsForDrawIo,
} from '../../../electron/main/agent/chat-mode'
import { buildFullAgentTools } from '../../../electron/main/agent/agent-tool-registry'

describe('draw-io-xml', () => {
  it('applies search/replace edits', () => {
    const { xml, errors } = applyDrawIoSearchReplaceEdits(DEFAULT_DRAW_IO_XML, [
      { search: 'Page-1', replace: 'Login Flow' },
    ])
    expect(errors).toHaveLength(0)
    expect(xml).toContain('Login Flow')
  })

  it('reports missing pattern', () => {
    const { errors } = applyDrawIoSearchReplaceEdits(DEFAULT_DRAW_IO_XML, [
      { search: 'NOT_IN_XML', replace: 'x' },
    ])
    expect(errors.length).toBeGreaterThan(0)
  })
})

describe('draw-io chat mode', () => {
  it('includes draw-io system addon', () => {
    expect(chatModeSystemAddon('draw-io')).toMatch(/DisplayDiagram/)
  })

  it('allows read-only codebase tools alongside diagram tools', () => {
    const names = filterToolsForDrawIo(buildFullAgentTools()).map((t) => t.name)
    expect(names).toEqual(expect.arrayContaining(['DisplayDiagram', 'Read', 'Grep', 'Glob']))
    expect(names).not.toContain('Edit')
    expect(names).not.toContain('Write')
    expect(names).not.toContain('Bash')
    expect(DRAW_IO_TOOL_NAMES.has('CodeGraphExplore')).toBe(true)
  })
})
