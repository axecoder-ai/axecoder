import type { LocaleId, MessageParams, MessageTree } from './types'
import { DEFAULT_LOCALE } from './types'
import en from './locales/en'
import zhCN from './locales/zh-CN'

export const messagesByLocale: Record<LocaleId, MessageTree> = {
  en,
  'zh-CN': zhCN,
}

const resolvePath = (tree: MessageTree, key: string): string | undefined => {
  const parts = key.split('.')
  let node: string | MessageTree | undefined = tree
  for (const part of parts) {
    if (node == null || typeof node === 'string') return undefined
    node = node[part]
  }
  return typeof node === 'string' ? node : undefined
}

const applyParams = (text: string, params?: MessageParams): string => {
  if (!params) return text
  return text.replace(/\{(\w+)\}/g, (_, name: string) => {
    const v = params[name]
    return v === undefined ? `{${name}}` : String(v)
  })
}

export const translate = (
  locale: LocaleId,
  key: string,
  params?: MessageParams,
): string => {
  const primary = resolvePath(messagesByLocale[locale], key)
  if (primary !== undefined) return applyParams(primary, params)
  if (locale !== DEFAULT_LOCALE) {
    const fallback = resolvePath(messagesByLocale[DEFAULT_LOCALE], key)
    if (fallback !== undefined) return applyParams(fallback, params)
  }
  return key
}
