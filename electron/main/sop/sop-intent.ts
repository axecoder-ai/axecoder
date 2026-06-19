import type { SopPipelinePhase } from './sop-types'

export type SopIntent = 'greenfield' | 'incremental'

const INCREMENTAL_RE =
  /修复|fix|bug|改|调整|重构|refactor|添加|add|update|patch|优化|补充|完善/i

/** MetaGPT 式意图：绿场走全 SOP，增量需求跳过 PRD/Design */
export const classifySopIntent = (brief: string, hasApplicationSource: boolean): SopIntent => {
  const t = brief.trim()
  if (!t) return 'greenfield'
  if (hasApplicationSource && INCREMENTAL_RE.test(t) && t.length < 320) return 'incremental'
  if (hasApplicationSource && t.length < 80 && INCREMENTAL_RE.test(t)) return 'incremental'
  return 'greenfield'
}

export const startPhaseForIntent = (intent: SopIntent): SopPipelinePhase =>
  intent === 'incremental' ? 'tasks' : 'prd'
