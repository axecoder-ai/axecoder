export type LocaleId = 'en' | 'zh-CN'

export const DEFAULT_LOCALE: LocaleId = 'en'

export const LOCALE_OPTIONS: { id: LocaleId; labelKey: string }[] = [
  { id: 'en', labelKey: 'settings.locale.en' },
  { id: 'zh-CN', labelKey: 'settings.locale.zhCN' },
]

export const normalizeLocale = (value: unknown): LocaleId =>
  value === 'zh-CN' || value === 'zh' ? 'zh-CN' : 'en'

/** Agent system-prompt language line */
export const agentLanguageForLocale = (locale: LocaleId): string =>
  locale === 'zh-CN' ? '中文' : 'English'

export type MessageParams = Record<string, string | number>

export type MessageTree = { [key: string]: string | MessageTree }
