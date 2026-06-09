import { describe, expect, it } from 'vitest'
import {
  autoPlanScore,
  formatAutoPlanNotice,
  normalizeAutoPlan,
  resolveShouldAutoPlan,
  shouldAutoPlan,
} from '../../../electron/main/agent/agent-auto-plan'
import {
  extractClassifierJson,
  parseClassifierResponse,
} from '../../../electron/main/agent/agent-auto-plan-classifier'

describe('agent-auto-plan', () => {
  it('normalizeAutoPlan', () => {
    expect(normalizeAutoPlan('on')).toBe('on')
    expect(normalizeAutoPlan('ask')).toBe('on')
    expect(normalizeAutoPlan('off')).toBe('off')
    expect(normalizeAutoPlan('')).toBe('off')
  })

  it('简单问答不触发', () => {
    expect(shouldAutoPlan('解释一下这个函数')).toBe(false)
    expect(shouldAutoPlan('/compact')).toBe(false)
  })

  it('复杂多步任务触发', () => {
    const msg =
      '请重构前端与后端配置，实现端到端联调，并补齐测试与文档。\n' +
      '1. 改 API\n2. 改 UI\n3. 跑 go test'
    expect(autoPlanScore(msg)).toBeGreaterThanOrEqual(2)
    expect(shouldAutoPlan(msg)).toBe(true)
  })

  it('classifier 关闭时 borderline 仅 score≥2', async () => {
    const borderline = '实现一个小功能'
    expect(autoPlanScore(borderline)).toBe(1)
    const r = await resolveShouldAutoPlan(borderline, {
      chatModelId: 'missing',
      classifierEnabled: false,
    })
    expect(r.shouldPlan).toBe(false)
    expect(r.via).toBe('heuristic')
  })

  it('parseClassifierResponse 解析 JSON', () => {
    const raw = 'Sure.\n{"needs_plan":true,"reason":"multi-step refactor"}'
    expect(parseClassifierResponse(raw)).toEqual({
      needsPlan: true,
      reason: 'multi-step refactor',
    })
    expect(extractClassifierJson(raw)).toContain('needs_plan')
  })

  it('formatAutoPlanNotice', () => {
    expect(
      formatAutoPlanNotice({
        shouldPlan: true,
        score: 1,
        via: 'classifier',
        reason: 'needs design',
      }),
    ).toContain('needs design')
  })
})
