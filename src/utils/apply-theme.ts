import type { AppTheme } from '../types/axecoder'
import { monacoThemeIdFor } from './monaco-themes'

export const applyTheme = (theme: AppTheme) => {
  document.documentElement.setAttribute('data-theme', theme)
}

export const monacoThemeFor = (theme: AppTheme): string => monacoThemeIdFor(theme)
