import { describe, it, expect } from 'vitest'
import { estimateTokens } from '@/utils/token-estimator'

describe('estimateTokens', () => {
  it('should return 0 for empty string', () => {
    expect(estimateTokens('')).toBe(0)
  })

  it('should estimate English text correctly', () => {
    const text = 'Hello world' // 11 chars -> ~3 tokens
    const tokens = estimateTokens(text)
    expect(tokens).toBeGreaterThan(0)
    expect(tokens).toBeLessThan(10)
  })

  it('should estimate Chinese text correctly', () => {
    const text = '你好世界' // 4 chars -> ~2 tokens
    const tokens = estimateTokens(text)
    expect(tokens).toBe(2)
  })

  it('should estimate mixed text correctly', () => {
    const text = 'Hello 世界' // 6 English + 2 Chinese -> ~1.5 + 1 = ~3 tokens
    const tokens = estimateTokens(text)
    expect(tokens).toBeGreaterThan(1)
    expect(tokens).toBeLessThan(5)
  })

  it('should handle long English text', () => {
    const text = 'a'.repeat(400) // 400 chars -> ~100 tokens
    expect(estimateTokens(text)).toBe(100)
  })

  it('should handle long Chinese text', () => {
    const text = '你'.repeat(200) // 200 chars -> 100 tokens
    expect(estimateTokens(text)).toBe(100)
  })
})
