import { describe, expect, it } from 'vitest'
import { topoSortTasks, parseTasksFromBody } from '../../../electron/main/sop/sop-task-runner'

describe('topoSortTasks', () => {
  it('按 deps 拓扑排序', () => {
    const sorted = topoSortTasks([
      { id: 't2', title: 'b', deps: ['t1'] },
      { id: 't1', title: 'a', deps: [] },
      { id: 't3', title: 'c', deps: ['t2'] },
    ])
    expect(sorted.map((t) => t.id)).toEqual(['t1', 't2', 't3'])
  })
})

describe('parseTasksFromBody', () => {
  it('解析 json 代码块', () => {
    const body = 'x\n```json\n{"title":"T","tasks":[{"id":"a","title":"A"}]}\n```'
    const doc = parseTasksFromBody(body)
    expect(doc?.tasks[0]?.id).toBe('a')
  })
})
