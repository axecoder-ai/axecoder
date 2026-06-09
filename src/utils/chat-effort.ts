import {
  DEFAULT_REASONING_EFFORT,
  normalizeReasoningEffort,
  REASONING_EFFORT_LEVELS,
  type ReasoningEffortLevel,
} from '../../shared/reasoning-effort'

const STORAGE_KEY = 'axecoder.chat.effort'

export { REASONING_EFFORT_LEVELS, type ReasoningEffortLevel }

export const loadStoredChatEffort = (): ReasoningEffortLevel => {
  try {
    return normalizeReasoningEffort(localStorage.getItem(STORAGE_KEY))
  } catch {
    return DEFAULT_REASONING_EFFORT
  }
}

export const saveStoredChatEffort = (level: ReasoningEffortLevel) => {
  try {
    localStorage.setItem(STORAGE_KEY, level)
  } catch {
    /* ignore */
  }
}

export const effortLabel = (level: ReasoningEffortLevel) => {
  if (level === 'auto') return 'Auto'
  return level.charAt(0).toUpperCase() + level.slice(1)
}
