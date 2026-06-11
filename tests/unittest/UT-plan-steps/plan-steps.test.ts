import { describe, expect, it } from 'vitest'
import { advancePlanStepStatuses, extractPlanSteps } from '../../../src/utils/plan-steps'

describe('plan-steps', () => {
  it('extractPlanSteps 解析 Phase 行', () => {
    const steps = extractPlanSteps({
      id: '1',
      name: 'P',
      overview: 'O',
      plan: '- **Phase 1:** Query Understanding\n- **Phase 2:** BM25 检索',
      filePath: 'docs/plans/plan-p.md',
    })
    expect(steps.length).toBe(2)
    expect(steps[0]!.label).toContain('Phase 1')
  })

  it('advancePlanStepStatuses 推进进度', () => {
    const next = advancePlanStepStatuses(['in_progress', 'pending', 'pending'])
    expect(next).toEqual(['completed', 'in_progress', 'pending'])
  })
})
