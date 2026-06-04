import type { App, InjectionKey, Ref } from 'vue'
import { inject, ref } from 'vue'
import {
  DEFAULT_LOCALE,
  normalizeLocale,
  translate,
  type LocaleId,
  type MessageParams,
} from '@shared/i18n'

export type { LocaleId, MessageParams }
export { normalizeLocale, DEFAULT_LOCALE }

type I18nContext = {
  locale: Ref<LocaleId>
  t: (key: string, params?: MessageParams) => string
}

const I18nKey: InjectionKey<I18nContext> = Symbol('app-i18n')

let localeRef: Ref<LocaleId> | null = null

export const installAppI18n = (app: App) => {
  localeRef = ref<LocaleId>(DEFAULT_LOCALE)
  const t = (key: string, params?: MessageParams) =>
    translate(localeRef!.value, key, params)
  const ctx: I18nContext = { locale: localeRef, t }
  app.config.globalProperties.$t = t
  app.provide(I18nKey, ctx)
}

export const useI18n = (): I18nContext => {
  const ctx = inject(I18nKey)
  if (ctx) return ctx
  const locale = ref(getAppLocale())
  return {
    locale,
    t: (key: string, params?: MessageParams) => translate(locale.value, key, params),
  }
}

export const setAppLocale = (locale: LocaleId) => {
  const next = normalizeLocale(locale)
  if (localeRef) localeRef.value = next
}

export const getAppLocale = (): LocaleId =>
  normalizeLocale(localeRef?.value ?? DEFAULT_LOCALE)
