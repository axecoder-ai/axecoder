import { translate, type MessageParams } from '@shared/i18n'
import { getAppLocale } from './index'

/** Translate outside Vue setup (slash commands, utils) */
export const appT = (key: string, params?: MessageParams) =>
  translate(getAppLocale(), key, params)
