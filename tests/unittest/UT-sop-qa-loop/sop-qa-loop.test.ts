import { describe, expect, it, vi } from 'vitest'
import { runQaLoop } from '../../../electron/main/sop/qa-loop'

describe('runQaLoop', () => {
  it('首轮通过则不再 fix', async () => {
    const fixBug = vi.fn()
    const r = await runQaLoop({
      maxRounds: 3,
      runTests: async () => ({ ok: true, output: 'ok' }),
      fixBug,
    })
    expect(r.passed).toBe(true)
    expect(r.rounds).toHaveLength(1)
    expect(fixBug).not.toHaveBeenCalled()
  })

  it('失败时回流 developer 最多 maxRounds 轮', async () => {
    let n = 0
    const fixBug = vi.fn(async () => 'fixed')
    const r = await runQaLoop({
      maxRounds: 2,
      runTests: async () => {
        n++
        return { ok: n >= 2, output: n === 1 ? 'fail' : 'pass' }
      },
      fixBug,
    })
    expect(r.passed).toBe(true)
    expect(fixBug).toHaveBeenCalledTimes(1)
  })

  it('未通过时 passed=false', async () => {
    const r = await runQaLoop({
      maxRounds: 2,
      runTests: async () => ({ ok: false, output: 'fail' }),
      fixBug: async () => 'still broken',
    })
    expect(r.passed).toBe(false)
    expect(r.rounds.length).toBe(2)
  })
})
