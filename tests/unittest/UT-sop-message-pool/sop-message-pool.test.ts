import { describe, expect, it } from 'vitest'
import { MessagePool } from '../../../electron/main/sop/message-pool'

describe('MessagePool', () => {
  it('subscribe 只返回 watch 命中的 causeBy', () => {
    const pool = new MessagePool()
    pool.publish({ causeBy: 'UserRequirement', phase: 'requirement', content: 'build todo' })
    pool.publish({ causeBy: 'WritePRD', phase: 'prd', content: 'prd body' })
    pool.publish({ causeBy: 'WriteDesign', phase: 'design', content: 'design body' })

    const prdOnly = pool.subscribe(['UserRequirement'])
    expect(prdOnly).toHaveLength(1)
    expect(prdOnly[0]!.causeBy).toBe('UserRequirement')

    const architect = pool.subscribe(['WritePRD'])
    expect(architect).toHaveLength(1)
    expect(architect[0]!.content).toBe('prd body')
  })

  it('summaryForWatch 拼接订阅消息', () => {
    const pool = new MessagePool()
    pool.publish({ causeBy: 'WritePRD', phase: 'prd', content: 'stories' })
    expect(pool.summaryForWatch(['WritePRD'])).toContain('[WritePRD]')
  })

  it('publish 与 summary 超长时截断', () => {
    const pool = new MessagePool()
    pool.publish({ causeBy: 'WriteCode', phase: 'implement', content: 'x'.repeat(20_000) })
    const msg = pool.all()[0]!
    expect(msg.content.length).toBeLessThan(24_000)
    expect(pool.summaryForWatch(['WriteCode']).length).toBeLessThanOrEqual(96_000 + 64)
  })

  it('toJSON 可 hydrate 恢复', () => {
    const pool = new MessagePool()
    pool.publish({ causeBy: 'UserRequirement', phase: 'requirement', content: 'x' })
    const json = pool.toJSON()
    const pool2 = new MessagePool(json)
    expect(pool2.all()).toHaveLength(1)
  })
})
