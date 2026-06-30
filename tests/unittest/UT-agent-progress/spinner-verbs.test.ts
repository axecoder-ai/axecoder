import { describe, expect, it } from 'vitest'
import {
  formatSpinnerVerb,
  nextSpinnerVerb,
  pickSpinnerVerb,
  SPINNER_VERBS,
} from '../../../src/utils/spinner-verbs'

describe('spinner-verbs', () => {
  it('includes common verbs', () => {
    expect(SPINNER_VERBS).toContain('Thinking')
    expect(SPINNER_VERBS).toContain('Wandering')
    expect(SPINNER_VERBS).toContain('Pondering')
    expect(SPINNER_VERBS.length).toBeGreaterThanOrEqual(80)
  })

  it('formats with ellipsis', () => {
    expect(formatSpinnerVerb('Thinking')).toBe('Thinking…')
  })

  it('picks from the pool', () => {
    const label = pickSpinnerVerb()
    expect(label.endsWith('…')).toBe(true)
    expect(SPINNER_VERBS.map(formatSpinnerVerb)).toContain(label)
  })

  it('avoids repeating the excluded verb when possible', () => {
    const current = formatSpinnerVerb('Thinking')
    let same = 0
    for (let i = 0; i < 20; i++) {
      if (nextSpinnerVerb(current) === current) same++
    }
    expect(same).toBeLessThan(20)
  })
})
