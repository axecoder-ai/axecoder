import { describe, expect, it } from 'vitest'
import { classifyPromptTier } from '../../../electron/main/ai/prompt-tier-heuristic'
import { resolveApiModelId } from '../../../electron/main/ai/api-model-resolve'
import type { ModelEntry } from '../../../electron/main/models-types'

const entry = (): ModelEntry => ({
  id: 'm1',
  name: 'DS',
  provider: 'openai',
  modelId: 'deep-model',
  fastApiModelId: 'fast-model',
  baseUrl: 'https://api.example.com/v1',
  enabled: true,
})

describe('classifyPromptTier', () => {
  it('短问为 fast', () => {
    expect(classifyPromptTier('你好')).toBe('fast')
  })

  it('含重构关键词为 deep', () => {
    expect(classifyPromptTier('请重构 auth 模块')).toBe('deep')
  })

  it('长文本为 deep', () => {
    expect(classifyPromptTier('x'.repeat(500))).toBe('deep')
  })
})

describe('resolveApiModelId', () => {
  it('auto 简单问用 fast API', () => {
    expect(resolveApiModelId(entry(), 'auto', 'hi')).toBe('fast-model')
  })

  it('auto 复杂问用 deep API', () => {
    expect(resolveApiModelId(entry(), 'auto', '请做架构审查')).toBe('deep-model')
  })

  it('tier fast 强制快速', () => {
    expect(resolveApiModelId(entry(), 'fast', '请做架构审查')).toBe('fast-model')
  })

  it('关闭分流一律 deep', () => {
    expect(resolveApiModelId(entry(), 'auto', 'hi', false)).toBe('deep-model')
  })

  it('未配置 fastApiModelId 时回退 deep', () => {
    const e = entry()
    delete e.fastApiModelId
    expect(resolveApiModelId(e, 'fast')).toBe('deep-model')
  })
})
