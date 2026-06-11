import { describe, expect, it } from 'vitest'
import { isPlanBuiltContent, markPlanBuiltFrontmatter } from '../../../src/utils/plan-built'

describe('plan-built', () => {
  it('isPlanBuiltContent 识别 frontmatter', () => {
    expect(isPlanBuiltContent('---\naxecoder-plan-built: true\n---\n')).toBe(true)
    expect(isPlanBuiltContent('---\naxecoder-plan: true\n---\n')).toBe(false)
  })

  it('markPlanBuiltFrontmatter 写入标记', () => {
    const next = markPlanBuiltFrontmatter('---\naxecoder-plan: true\n---\n\n# Plan')
    expect(next).toContain('axecoder-plan-built: true')
  })
})
