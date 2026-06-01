import { describe, expect, it } from 'vitest'
import {
  isMarkdownPath,
  languageLabelForPath,
  monacoLanguageForPath,
} from '../../../src/utils/editor-language'

describe('editor-language', () => {
  it('maps .go to go', () => {
    expect(monacoLanguageForPath('/proj/main.go')).toBe('go')
    expect(languageLabelForPath('/proj/main.go')).toBe('Go')
  })

  it('maps .ts to typescript', () => {
    expect(monacoLanguageForPath('src/foo.ts')).toBe('typescript')
    expect(languageLabelForPath('src/foo.ts')).toBe('TypeScript')
  })

  it('maps markdown extensions', () => {
    expect(monacoLanguageForPath('readme.md')).toBe('markdown')
    expect(isMarkdownPath('readme.md')).toBe(true)
    expect(isMarkdownPath('readme.markdown')).toBe(true)
  })

  it('unknown extension uses plaintext', () => {
    expect(monacoLanguageForPath('data.xyz')).toBe('plaintext')
    expect(languageLabelForPath('data.xyz')).toBe('Plain Text')
  })

  it('null path is plaintext', () => {
    expect(monacoLanguageForPath(null)).toBe('plaintext')
    expect(languageLabelForPath(null)).toBe('Plain Text')
    expect(isMarkdownPath(null)).toBe(false)
  })
})
