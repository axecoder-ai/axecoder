import type { AppTheme } from '../types/writcraft'

export const applyTheme = (theme: AppTheme) => {
  document.documentElement.setAttribute('data-theme', theme)
}

export const monacoThemeFor = (theme: AppTheme): string =>
  theme === 'aura-light' ? 'vs' : 'vs-dark'
