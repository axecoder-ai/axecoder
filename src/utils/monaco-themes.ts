import type { AppTheme } from '../types/axecoder'

/** 使用 Monaco 内置主题，避免自定义 defineTheme 触发 fontStyle 崩溃 */
export const monacoThemeIdFor = (theme: AppTheme): string =>
  theme === 'aura-light' ? 'vs' : 'vs-dark'
