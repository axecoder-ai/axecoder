import type { BuiltinUserRole } from '../users-types'

/** MetaGPT 式 Action 标识，用于 Message Pool causeBy / watch */
export type SopActionType =
  | 'UserRequirement'
  | 'WritePRD'
  | 'WriteDesign'
  | 'WriteTasks'
  | 'WriteCode'
  | 'RunQA'
  | 'DeliverSummary'

export type SopPipelinePhase =
  | 'idle'
  | 'requirement'
  | 'prd'
  | 'design'
  | 'tasks'
  | 'implement'
  | 'qa'
  | 'done'

export type SopArtifactKind = 'prd' | 'design' | 'tasks' | 'qa-report'

export type SopPoolMessage = {
  id: string
  causeBy: SopActionType
  phase: SopPipelinePhase
  speakerUserId?: string
  content: string
  artifactPath?: string
  createdAt: number
}

export type SopPhaseDef = {
  phase: SopPipelinePhase
  action: SopActionType
  builtinRole: BuiltinUserRole
  artifact?: SopArtifactKind
  watch: SopActionType[]
}

/** 固定 SOP 阶段链（MetaGPT 软件公司流水线） */
export const SOP_PHASE_CHAIN: SopPhaseDef[] = [
  {
    phase: 'prd',
    action: 'WritePRD',
    builtinRole: 'product_analyst',
    artifact: 'prd',
    watch: ['UserRequirement'],
  },
  {
    phase: 'design',
    action: 'WriteDesign',
    builtinRole: 'architect',
    artifact: 'design',
    watch: ['WritePRD'],
  },
  {
    phase: 'tasks',
    action: 'WriteTasks',
    builtinRole: 'planner',
    artifact: 'tasks',
    watch: ['WriteDesign'],
  },
  {
    phase: 'implement',
    action: 'WriteCode',
    builtinRole: 'developer',
    watch: ['WriteTasks', 'UserRequirement'],
  },
  {
    phase: 'qa',
    action: 'RunQA',
    builtinRole: 'qa_engineer',
    artifact: 'qa-report',
    watch: ['WriteCode'],
  },
]

export const nextSopPhase = (current: SopPipelinePhase): SopPipelinePhase | null => {
  const order: SopPipelinePhase[] = [
    'idle',
    'requirement',
    'prd',
    'design',
    'tasks',
    'implement',
    'qa',
    'done',
  ]
  const i = order.indexOf(current)
  if (i < 0 || i >= order.length - 1) return null
  return order[i + 1]!
}

export const sopPhaseDef = (phase: SopPipelinePhase): SopPhaseDef | undefined =>
  SOP_PHASE_CHAIN.find((d) => d.phase === phase)

export const slugFromBrief = (brief: string): string => {
  const raw = brief
    .trim()
    .slice(0, 40)
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .toLowerCase()
  return raw || `task-${Date.now()}`
}
