import { describe, expect, it } from 'vitest'
import { isUnderHiddenPathSegment } from '../../../src/utils/hidden-path'

describe('isUnderHiddenPathSegment', () => {
  it('普通路径返回 false', () => {
    expect(isUnderHiddenPathSegment('src/App.vue')).toBe(false)
  })

  it('.git 段返回 true', () => {
    expect(isUnderHiddenPathSegment('.git/config')).toBe(true)
  })

  it('.axecoder 段返回 true', () => {
    expect(isUnderHiddenPathSegment('.axecoder/sessions/x.json')).toBe(true)
  })
})
