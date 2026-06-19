import { describe, expect, it } from 'vitest'
import { applyDrawIoSearchReplaceEdits } from '../../../electron/main/draw-io/draw-io-xml'
import { DEFAULT_DRAW_IO_XML } from '../../../electron/main/draw-io/draw-io-defaults'
import { chatModeSystemAddon } from '../../../electron/main/agent/chat-mode'

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
})
