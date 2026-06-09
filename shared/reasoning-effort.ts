export const REASONING_EFFORT_LEVELS = ['auto', 'low', 'medium', 'high', 'max'] as const
export type ReasoningEffortLevel = (typeof REASONING_EFFORT_LEVELS)[number]

export const DEFAULT_REASONING_EFFORT: ReasoningEffortLevel = 'auto'

export const normalizeReasoningEffort = (raw: string | undefined | null): ReasoningEffortLevel => {
  const v = (raw ?? '').trim().toLowerCase()
  if (!v || v === 'auto') return 'auto'
  if (REASONING_EFFORT_LEVELS.includes(v as ReasoningEffortLevel)) return v as ReasoningEffortLevel
  return 'auto'
}

/** auto 不传 API；其余映射为 reasoning_effort */
export const reasoningEffortForApi = (level: ReasoningEffortLevel): string | undefined => {
  if (level === 'auto') return undefined
  return level
}
