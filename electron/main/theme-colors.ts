import type { AppTheme } from './models-types'

/** 与 `src/style.css` 中各主题 `--wc-bg` 一致，用于 BrowserWindow backgroundColor */
export const themeBackgroundColor = (theme: AppTheme): string => {
  if (theme === 'claude') return '#f5f5f5'
  if (theme === 'aura-light') return '#f5f5f5'
  if (theme === 'aura-dark') return '#1c1c1c'
  return '#1e1e1e'
}
