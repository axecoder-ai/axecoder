import type { MessagePool } from './message-pool'
import type { SopActionType, SopPipelinePhase } from './sop-types'
import { SOP_PHASE_CHAIN } from './sop-types'
import type { SopIntent } from './sop-intent'
import { startPhaseForIntent } from './sop-intent'

/** Action → 必须先完成的 causeBy 集合（MetaGPT 订阅依赖） */
export const SOP_ACTION_DEPS: Record<SopActionType, SopActionType[]> = {
  UserRequirement: [],
  WritePRD: ['UserRequirement'],
  WriteDesign: ['WritePRD'],
  WriteTasks: ['WriteDesign'],
  WriteCode: ['WriteTasks'],
  RunQA: ['WriteCode'],
  DeliverSummary: ['RunQA'],
}

const phaseForAction = (action: SopActionType): SopPipelinePhase | undefined =>
  SOP_PHASE_CHAIN.find((d) => d.action === action)?.phase

export const completedActions = (pool: MessagePool): Set<SopActionType> => {
  const set = new Set<SopActionType>()
  for (const m of pool.all()) set.add(m.causeBy)
  return set
}

export const actionDepsMet = (action: SopActionType, done: Set<SopActionType>): boolean =>
  SOP_ACTION_DEPS[action].every((d) => done.has(d))

/** 增量意图：WriteTasks 可仅依赖 UserRequirement */
export const actionDepsMetForIntent = (
  action: SopActionType,
  done: Set<SopActionType>,
  intent: SopIntent,
): boolean => {
  if (intent === 'incremental' && action === 'WriteTasks') {
    return done.has('UserRequirement')
  }
  return actionDepsMet(action, done)
}

export const resolveStartPhase = (intent: SopIntent, done: Set<SopActionType>): SopPipelinePhase => {
  const preferred = startPhaseForIntent(intent)
  const def = SOP_PHASE_CHAIN.find((d) => d.phase === preferred)
  if (def && actionDepsMetForIntent(def.action, done, intent)) return preferred
  for (const step of SOP_PHASE_CHAIN) {
    if (!done.has(step.action) && actionDepsMetForIntent(step.action, done, intent)) {
      return step.phase
    }
  }
  return preferred
}

export const nextRunnablePhase = (
  current: SopPipelinePhase,
  pool: MessagePool,
  intent: SopIntent,
): SopPipelinePhase | null => {
  const done = completedActions(pool)
  const order: SopPipelinePhase[] = ['prd', 'design', 'tasks', 'implement', 'qa', 'done']
  const start = intent === 'incremental' ? 'tasks' : 'prd'
  const slice = order.slice(order.indexOf(start))
  const curIdx = slice.indexOf(current)
  const rest = curIdx >= 0 ? slice.slice(curIdx + 1) : slice
  for (const ph of rest) {
    if (ph === 'done') return 'done'
    const def = SOP_PHASE_CHAIN.find((d) => d.phase === ph)
    if (!def) continue
    if (!done.has(def.action) && actionDepsMetForIntent(def.action, done, intent)) return ph
    if (!done.has(def.action)) return ph
  }
  const lastAction = phaseForAction('RunQA')
  if (lastAction && done.has('RunQA')) return 'done'
  return 'done'
}
