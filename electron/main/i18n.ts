import { getConfig } from './config-store'
import { translate, normalizeLocale, type LocaleId, type MessageParams } from '../../shared/i18n'

let cachedLocale: LocaleId | null = null

export const refreshMainLocale = async (): Promise<LocaleId> => {
  const cfg = await getConfig()
  cachedLocale = normalizeLocale(cfg.locale)
  return cachedLocale
}

export const getMainLocale = (): LocaleId => cachedLocale ?? 'en'

export const t = (key: string, params?: MessageParams): string =>
  translate(getMainLocale(), key, params)

/** Call after setConfig so IPC handlers use the new locale */
export const invalidateMainLocaleCache = () => {
  cachedLocale = null
}
