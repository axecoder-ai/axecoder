import { describe, expect, it } from 'vitest'
import {
  mergeAiAndRuleParameters,
  parseAiParametersJson,
  splitContentForAiChunks,
} from '../../../electron/main/background-init-ai'

describe('background-init-ai', () => {
  it('解析模型返回的 JSON（含 kind）', () => {
    const raw = `{"parameters":[{"id":"1","title":"SpringBoot 2.7.10","kind":"technical"},{"id":"2","title":"业绩不少于2个","kind":"business"}]}`
    const items = parseAiParametersJson(raw)
    expect(items).toHaveLength(2)
    expect(items[0].kind).toBe('technical')
    expect(items[1].kind).toBe('business')
  })

  it('大文件按段切分', () => {
    const long = 'a\n'.repeat(50000)
    const chunks = splitContentForAiChunks(long, 10000)
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.join('')).toBe(long)
  })

  it('合并 AI 与规则参数', () => {
    const merged = mergeAiAndRuleParameters(
      [
        {
          id: '2',
          label: '参数2',
          title: 'Redis 6.2',
          status: 'pending',
          kind: 'technical',
        },
      ],
      [
        {
          id: '1',
          label: '参数1',
          title: 'MySQL',
          status: 'pending',
          kind: 'technical',
          sourcePath: 'a.md',
        },
      ],
    )
    expect(merged).toHaveLength(2)
    expect(merged.map((p) => p.id)).toEqual(['1', '2'])
  })
})
