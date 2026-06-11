import type { AgentPendingPlan } from '../types/axecoder'

export type PlanStepStatus = 'pending' | 'in_progress' | 'completed'

export type PlanStep = { id: string; label: string }

export const extractPlanSteps = (pending: AgentPendingPlan): PlanStep[] => {
  if (pending.todos?.length) {
    return pending.todos.map((t) => ({ id: t.id, label: t.content }))
  }
  const steps: PlanStep[] = []
  const plan = pending.plan || ''

  const phaseRe = /^\s*(?:[-*]\s+)?(?:\*\*)?Phase\s*(\d+)\s*[：:]\s*(.+?)(?:\*\*)?\s*$/gim
  let m: RegExpExecArray | null
  while ((m = phaseRe.exec(plan))) {
    steps.push({ id: `phase-${m[1]}`, label: `Phase ${m[1]}: ${m[2]!.trim()}` })
  }
  if (steps.length) return steps

  for (const line of plan.split('\n')) {
    const cm = line.match(/^\s*[-*]\s+\[[\sxX]\]\s+(.+)$/)
    if (cm) steps.push({ id: `step-${steps.length}`, label: cm[1]!.trim() })
  }
  if (steps.length) return steps

  for (const line of plan.split('\n')) {
    const hm = line.match(/^##\s+(.+)$/)
    if (hm && !/^todos?$/i.test(hm[1]!)) {
      steps.push({ id: `h-${steps.length}`, label: hm[1]!.trim() })
    }
  }
  return steps
}

export const initialPlanStepStatuses = (count: number): PlanStepStatus[] =>
  Array.from({ length: count }, () => 'pending')

export const startPlanStepStatuses = (count: number): PlanStepStatus[] => {
  if (count <= 0) return []
  return Array.from({ length: count }, (_, i) =>
    i === 0 ? 'in_progress' : 'pending',
  ) as PlanStepStatus[]
}

export const advancePlanStepStatuses = (statuses: PlanStepStatus[]): PlanStepStatus[] => {
  const next = [...statuses]
  const activeIdx = next.findIndex((s) => s === 'in_progress')
  if (activeIdx < 0) return next
  next[activeIdx] = 'completed'
  if (activeIdx + 1 < next.length) next[activeIdx + 1] = 'in_progress'
  return next
}

export const completeAllPlanStepStatuses = (statuses: PlanStepStatus[]): PlanStepStatus[] =>
  statuses.map(() => 'completed')
