import type { AppTheme } from '../types/axecoder'
import { applyTheme } from './apply-theme'

/** 独立 AI Performance 窗始终跟随主应用主题，不再单独覆盖。 */
export const applyMetricsWindowTheme = (globalTheme: AppTheme): AppTheme => {
  applyTheme(globalTheme)
  return globalTheme
}
