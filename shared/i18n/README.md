# AxeCoder i18n

Shared message catalogs for **renderer** (`src/i18n`, CSP-safe) and **main process** (`electron/main/i18n.ts`).

## Locales

- `en` — default
- `zh-CN` — 简体中文

## Usage

**Vue (template):** `{{ $t('welcome.tagline') }}`

**Vue (script):** `import { useI18n } from '../i18n'` then `const { t } = useI18n()`

**Outside setup (slash commands, utils):** `import { appT } from '@/i18n/translate'`

**Main process:** `import { t } from './i18n'` (uses locale from `~/.axecoder/config.json` → `locale`)

## Adding strings

1. Add the key under `shared/i18n/locales/en.ts`
2. Mirror in `shared/i18n/locales/zh-CN.ts`
3. Use dot paths: `section.subsection.key`

## User setting

Settings → General → **Display language**. Stored as `locale` in app config; Agent system prompts follow `agentLanguageForLocale(locale)`.
