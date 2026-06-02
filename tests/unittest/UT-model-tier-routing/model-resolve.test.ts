import { describe, expect, it } from 'vitest'
import {
  modelTaskKindForSubagentType,
  modelTaskKindForWorkshopRole,
  resolveModelIdFromFile,
} from '../../../electron/main/ai/model-resolve'
import type { ModelsFile } from '../../../electron/main/models-types'

const sample = (): ModelsFile => ({
  schemaVersion: 1,
  activeModelId: 'primary',
  models: [
    {
      id: 'primary',
      name: 'Primary',
      provider: 'openai',
      modelId: 'gpt-4o',
      fastApiModelId: 'gpt-4o-mini',
      baseUrl: 'https://api.openai.com/v1',
      enabled: true,
    },
  ],
})

describe('resolveModelIdFromFile', () => {
  it('main 与 subagent 均用 activeModelId', () => {
    expect(resolveModelIdFromFile(sample(), 'main')).toBe('primary')
    expect(resolveModelIdFromFile(sample(), 'subagent')).toBe('primary')
  })
})

describe('modelTaskKindForSubagentType', () => {
  it('explore/plan 为 subagent', () => {
    expect(modelTaskKindForSubagentType('explore')).toBe('subagent')
    expect(modelTaskKindForSubagentType('plan')).toBe('subagent')
  })

  it('generalPurpose 为 main', () => {
    expect(modelTaskKindForSubagentType('generalPurpose')).toBe('main')
  })
})

describe('modelTaskKindForWorkshopRole', () => {
  it('经理始终 main', () => {
    expect(modelTaskKindForWorkshopRole('manager', 'plan')).toBe('main')
  })

  it('测试为 subagent', () => {
    expect(modelTaskKindForWorkshopRole('tester', 'execute')).toBe('subagent')
  })

  it('后端执行为 main', () => {
    expect(modelTaskKindForWorkshopRole('backend', 'execute')).toBe('main')
  })
})
