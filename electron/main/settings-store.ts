import { BrowserWindow } from 'electron'
import { getConfig, setConfig } from './config-store'
import { refreshMainLocale } from './i18n'
import { broadcastToRenderers } from './renderer-broadcast'
import type { AppConfig, AppTheme } from './models-types'
import { themeBackgroundColor } from './theme-colors'

export type AppSettings = AppConfig

export const getSettings = async (): Promise<AppSettings> => getConfig()

const syncNativeWindowBackgrounds = (theme: AppTheme) => {
  const bg = themeBackgroundColor(theme)
  for (const w of BrowserWindow.getAllWindows()) {
    if (!w.isDestroyed()) w.setBackgroundColor(bg)
  }
}

export const setSettings = async (partial: Partial<AppSettings>): Promise<AppSettings> => {
  const next = await setConfig(partial)
  await refreshMainLocale()
  if (partial.theme !== undefined) {
    syncNativeWindowBackgrounds(next.theme)
    broadcastToRenderers('settings:theme', next.theme)
  }
  return next
}
