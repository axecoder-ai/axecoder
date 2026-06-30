import { describe, expect, it } from 'vitest'
import {
  agentToolToAcpKind,
  buildPermissionOptions,
  extractPromptText,
  mapToolStatus,
} from '../../../electron/main/acp/acp-tool-mapper'

describe('acp-tool-mapper', () => {
  it('maps Read/Write/Bash to ACP kinds', () => {
    expect(agentToolToAcpKind('Read')).toBe('read')
    expect(agentToolToAcpKind('Write')).toBe('edit')
    expect(agentToolToAcpKind('Edit')).toBe('edit')
    expect(agentToolToAcpKind('Bash')).toBe('execute')
    expect(agentToolToAcpKind('Grep')).toBe('search')
    expect(agentToolToAcpKind('UnknownTool')).toBe('other')
  })

  it('extractPromptText joins text blocks', () => {
    expect(
      extractPromptText([
        { type: 'text', text: 'hello' },
        { type: 'text', text: 'world' },
      ]),
    ).toBe('hello\nworld')
  })

  it('buildPermissionOptions has allow and reject', () => {
    const opts = buildPermissionOptions()
    expect(opts.map((o) => o.optionId)).toEqual(['allow_once', 'reject_once'])
  })

  it('mapToolStatus maps start/done', () => {
    expect(mapToolStatus('start')).toBe('pending')
    expect(mapToolStatus('done', true)).toBe('completed')
    expect(mapToolStatus('done', false)).toBe('failed')
  })
})
