import { describe, expect, it } from 'vitest'
import { fuzzyScore, fuzzyFilterPaths } from '../../../src/utils/quick-open-fuzzy'

describe('fuzzyScore', () => {
  it('完全匹配文件名优先', () => {
    expect(fuzzyScore('app', 'src/App.vue')).toBeGreaterThan(fuzzyScore('app', 'src/utils/map.ts'))
  })

  it('无匹配返回 -1', () => {
    expect(fuzzyScore('zzz', 'src/App.vue')).toBe(-1)
  })
})

describe('fuzzyFilterPaths', () => {
  it('过滤并排序', () => {
    const r = fuzzyFilterPaths('App', ['src/utils/map.ts', 'src/App.vue', 'lib/app.ts'])
    expect(r).toContain('src/App.vue')
    expect(r).not.toContain('src/utils/map.ts')
  })

  it('空查询返回前 limit 条', () => {
    const paths = ['a.ts', 'b.ts', 'c.ts']
    expect(fuzzyFilterPaths('', paths, 2)).toEqual(['a.ts', 'b.ts'])
  })
})
