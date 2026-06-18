import type { SopPipelinePhase } from './sop-types'

/** rppit 步骤编号 → SOP phase（供 playbook 与 software-company 模式对齐） */
export const RPPIT_STEP_TO_SOP_PHASE: Record<number, SopPipelinePhase> = {
  0: 'requirement',
  1: 'prd',
  2: 'prd',
  3: 'design',
  4: 'tasks',
  5: 'implement',
  6: 'qa',
  7: 'done',
}

export const rppitPhaseHint = (): string =>
  [
    '## SOP phase 映射（software-company / MetaGPT 对齐）',
    '- 步骤 0 → requirement',
    '- 步骤 1–2 → prd（提案/选型）',
    '- 步骤 3 → design（已确认方案）',
    '- 步骤 4 → tasks（make-plan）',
    '- 步骤 5 → implement',
    '- 步骤 6 → qa（code-review）',
    '- 步骤 7 → done（合并交付）',
  ].join('\n')
