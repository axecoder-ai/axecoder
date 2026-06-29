import { describe, expect, it } from 'vitest'
import { buildDiffOpenFile, diffTabPath, upsertOpenFile } from '../../../src/composables/workbench-state'

describe('diffTabPath', () => {
  it('appends (diff) suffix', () => {
    expect(diffTabPath('/proj/hello.go')).toBe('/proj/hello.go (diff)')
  })
})

describe('buildDiffOpenFile', () => {
  it('builds diff tab with original and modified', () => {
    const tab = buildDiffOpenFile('/proj/hello.go', 'old', 'new')
    expect(tab.path).toBe('/proj/hello.go (diff)')
    expect(tab.name).toBe('hello.go (diff)')
    expect(tab.kind).toBe('diff')
    expect(tab.diffOriginal).toBe('old')
    expect(tab.content).toBe('new')
    expect(tab.dirty).toBe(false)
    expect(tab.pinned).toBe(true)
  })
})

describe('upsertOpenFile with diff tab', () => {
  it('replaces existing diff tab for same path', () => {
    const a = buildDiffOpenFile('/a.go', 'v1', 'v2')
    const b = buildDiffOpenFile('/a.go', 'v1b', 'v2b')
    const next = upsertOpenFile([a], b)
    expect(next).toHaveLength(1)
    expect(next[0]?.content).toBe('v2b')
  })
})
