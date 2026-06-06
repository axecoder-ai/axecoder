import { describe, expect, it } from 'vitest'
import {
  parseWorkbenchRoleFromHash,
  parseWorkbenchRoleFromLocation,
} from '../../../src/utils/workbench-window-role'

describe('parseWorkbenchRoleFromHash', () => {
  it('companion hash', () => {
    expect(parseWorkbenchRoleFromHash('#companion')).toBe('companion')
    expect(parseWorkbenchRoleFromHash('companion')).toBe('companion')
  })

  it('metrics hash', () => {
    expect(parseWorkbenchRoleFromHash('#metrics')).toBe('metrics')
    expect(parseWorkbenchRoleFromHash('metrics')).toBe('metrics')
  })

  it('trace hash', () => {
    expect(parseWorkbenchRoleFromHash('#trace')).toBe('trace')
  })

  it('default main', () => {
    expect(parseWorkbenchRoleFromHash('')).toBe('main')
    expect(parseWorkbenchRoleFromHash('#')).toBe('main')
    expect(parseWorkbenchRoleFromHash('#other')).toBe('main')
  })
})

describe('parseWorkbenchRoleFromLocation', () => {
  it('reads hash from location', () => {
    expect(parseWorkbenchRoleFromLocation({ hash: '#companion' })).toBe('companion')
  })
})
