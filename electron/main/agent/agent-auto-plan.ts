/** Reasonix auto_plan 启发式（internal/control/auto_plan.go）精简移植 */

export type AutoPlanMode = 'off' | 'on'

const NUMBERED_LIST_RE = /^\s*(?:[-*]|\d+[.)])\s+\S/m

const COMPLEX_INTENT_TERMS = [
  'implement',
  'add support',
  'refactor',
  'migrate',
  'redesign',
  'end-to-end',
  'e2e',
  'wire up',
  'integration',
  'fix the issue',
  'build a',
  '实现',
  '新增',
  '支持',
  '重构',
  '迁移',
  '改造',
  '端到端',
  '联调',
  '接入',
  '修复这个问题',
  '修一下这个问题',
  '补齐',
  '设计',
]

const MULTI_SURFACE_TERMS = [
  'multiple files',
  'several files',
  'across',
  'frontend',
  'backend',
  'config',
  'tests',
  'docs',
  'ui',
  'api',
  'database',
  'schema',
  '多个文件',
  '多处',
  '前端',
  '后端',
  '配置',
  '测试',
  '文档',
  '接口',
  '数据库',
]

const DOCS_AND_ISSUE_TERMS = [
  'prd',
  'issue',
  'requirements',
  'spec',
  'proposal',
  'roadmap',
  '需求',
  '产品文档',
  '接口文档',
  '方案',
  '规划',
]

export const normalizeAutoPlan = (mode: unknown): AutoPlanMode => {
  const m = String(mode ?? '')
    .trim()
    .toLowerCase()
  if (m === 'on' || m === 'ask') return 'on'
  return 'off'
}

const containsAny = (s: string, terms: string[]) => terms.some((t) => s.includes(t))

const isLowRiskQuestion = (lower: string): boolean => {
  const t = lower.trim()
  if (
    t.startsWith('解释') ||
    t.startsWith('说明') ||
    t.startsWith('怎么看') ||
    t.startsWith('查一下') ||
    t.startsWith('运行') ||
    t.startsWith('run ') ||
    t.startsWith('show ') ||
    t.startsWith('what ') ||
    t.startsWith('why ') ||
    t.startsWith('how ')
  ) {
    return !containsAny(t, COMPLEX_INTENT_TERMS)
  }
  return false
}

/** 分数越高越像多步实现任务；≥2 时建议自动进入 plan mode */
export const autoPlanScore = (input: string): number => {
  const text = input.trim()
  if (!text || text.startsWith('/') || text.startsWith('[plan mode]')) return 0
  const lower = text.toLowerCase()
  if (isLowRiskQuestion(lower)) return 0

  let score = 0
  if ([...text].length >= 160) score++
  if (NUMBERED_LIST_RE.test(text)) score++
  if ((text.match(/\n/g) ?? []).length >= 2) score++
  if (containsAny(lower, COMPLEX_INTENT_TERMS)) score++
  if (containsAny(lower, MULTI_SURFACE_TERMS)) score++
  if (containsAny(lower, DOCS_AND_ISSUE_TERMS)) score++
  if (
    (text.match(/@/g) ?? []).length >= 2 ||
    (lower.match(/\.go/g) ?? []).length +
      (lower.match(/\.ts/g) ?? []).length +
      (lower.match(/\.tsx/g) ?? []).length +
      (lower.match(/\.js/g) ?? []).length >=
      2
  ) {
    score++
  }
  return score
}

export const shouldAutoPlan = (input: string): boolean => autoPlanScore(input) >= 2

export type AutoPlanResolveResult = {
  shouldPlan: boolean
  score: number
  via: 'none' | 'heuristic' | 'classifier'
  reason?: string
  classifierError?: string
}

export type ResolveAutoPlanOptions = {
  chatModelId: string
  /** 空则用 chat 模型的 fastApiModelId 档做分类 */
  classifierModelId?: string
  /** false 时 score 1–2 不调模型，仅 score≥2 走启发式 */
  classifierEnabled?: boolean
}

/** 对齐 Reasonix shouldAutoPlan：score≤0 跳过；score≤2 可调分类器；否则 score≥2 */
export const resolveShouldAutoPlan = async (
  input: string,
  opts: ResolveAutoPlanOptions,
): Promise<AutoPlanResolveResult> => {
  const score = autoPlanScore(input)
  if (score <= 0) return { shouldPlan: false, score, via: 'none' }

  const useClassifier = opts.classifierEnabled !== false
  if (useClassifier && score <= 2) {
    try {
      const { classifyAutoPlanNeed } = await import('./agent-auto-plan-classifier')
      const { needsPlan, reason } = await classifyAutoPlanNeed(input, score, {
        chatModelId: opts.chatModelId,
        classifierModelId: opts.classifierModelId,
      })
      return { shouldPlan: needsPlan, score, via: 'classifier', reason }
    } catch (e) {
      const classifierError = e instanceof Error ? e.message : String(e)
      return {
        shouldPlan: score >= 2,
        score,
        via: 'heuristic',
        classifierError,
      }
    }
  }

  return { shouldPlan: score >= 2, score, via: 'heuristic' }
}

export const formatAutoPlanNotice = (result: AutoPlanResolveResult): string => {
  if (result.via === 'classifier' && result.reason) {
    return `auto plan classifier: ${result.reason}`
  }
  if (result.classifierError) {
    return `auto plan: task looks multi-step (classifier failed, heuristic fallback)`
  }
  return 'auto plan: task looks multi-step; drafting a plan first (read-only until ExitPlanMode)'
}

export const AUTO_PLAN_NOTICE =
  'auto plan: task looks multi-step; drafting a plan first (read-only until ExitPlanMode)'
