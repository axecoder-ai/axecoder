import { getConfig, setConfig } from './config-store'
import { refreshMainLocale } from './i18n'
import type { AppConfig } from './models-types'

export type AppSettings = AppConfig

export const getSettings = async (): Promise<AppSettings> => getConfig()

export const setSettings = async (partial: Partial<AppSettings>): Promise<AppSettings> => {
  const next = await setConfig(partial)
  await refreshMainLocale()
  return next
}
