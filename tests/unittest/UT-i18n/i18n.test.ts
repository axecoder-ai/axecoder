import { describe, expect, it } from 'vitest'
import { translate } from '../../../shared/i18n'

describe('shared i18n', () => {
  it('translates nested keys', () => {
    expect(translate('en', 'welcome.tagline')).toContain('AI')
    expect(translate('zh-CN', 'welcome.tagline')).toContain('协作')
  })

  it('interpolates params', () => {
    expect(translate('en', 'common.requestFailed', { error: 'x' })).toBe('Request failed: x')
  })

  it('falls back to English', () => {
    expect(translate('zh-CN', 'nonexistent.key.xyz')).toBe('nonexistent.key.xyz')
    expect(translate('en', 'errors.modelNotFound')).toBe('Model not found')
  })
})
