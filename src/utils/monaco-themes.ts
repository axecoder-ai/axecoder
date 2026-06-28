import type { AppTheme } from '../types/axecoder'

/** Use built-in Monaco themes to avoid defineTheme fontStyle crashes */
export const monacoThemeIdFor = (theme: AppTheme): string =>
  theme === 'aura-light' || theme === 'claude' ? 'vs' : 'vs-dark'
