import type { AppTheme } from '../types/axecoder'
import { applyTheme } from './apply-theme'

export type MetricsWindowThemeMode = 'follow' | AppTheme

const KEY = 'axecoder.metricsWindow.themeMode'

export const getMetricsWindowThemeMode = (): MetricsWindowThemeMode => {
  const v = localStorage.getItem(KEY)
  if (!v || v === 'follow') return 'follow'
  if (v === 'vscode' || v === 'aura-light' || v === 'aura-dark') return v
  return 'follow'
}

export const setMetricsWindowThemeMode = (mode: MetricsWindowThemeMode) => {
  localStorage.setItem(KEY, mode)
}

export const resolveMetricsWindowTheme = (globalTheme: AppTheme): AppTheme => {
  const mode = getMetricsWindowThemeMode()
  return mode === 'follow' ? globalTheme : mode
}

export const applyMetricsWindowTheme = (globalTheme: AppTheme): AppTheme => {
  const theme = resolveMetricsWindowTheme(globalTheme)
  applyTheme(theme)
  return theme
}
