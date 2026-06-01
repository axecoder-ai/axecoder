import { describe, expect, it } from 'vitest'
import { monacoThemeIdFor } from '../../../src/utils/monaco-themes'

describe('monaco-themes', () => {
  it('maps AppTheme to built-in Monaco themes', () => {
    expect(monacoThemeIdFor('vscode')).toBe('vs-dark')
    expect(monacoThemeIdFor('aura-light')).toBe('vs')
    expect(monacoThemeIdFor('aura-dark')).toBe('vs-dark')
  })
})
