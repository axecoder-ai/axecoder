import { describe, expect, it } from 'vitest'
import {
  anyDirty,
  closeOpenFile,
  nextActiveAfterClose,
  removeOpenFilesByPath,
  updateOpenFilePath,
  upsertOpenFile,
  type OpenFile,
} from '../../../src/composables/workbench-state'

const f = (path: string, dirty = false): OpenFile => ({
  path,
  name: path.split('/').pop()!,
  content: '',
  dirty,
})

describe('upsertOpenFile', () => {
  it('追加新文件', () => {
    const r = upsertOpenFile([], f('/a.md'))
    expect(r).toHaveLength(1)
  })

  it('更新已存在', () => {
    const r = upsertOpenFile([f('/a.md')], { ...f('/a.md'), content: 'x', dirty: true })
    expect(r[0].content).toBe('x')
    expect(r[0].dirty).toBe(true)
  })
})

describe('closeOpenFile', () => {
  it('移除指定路径', () => {
    expect(closeOpenFile([f('/a.md'), f('/b.md')], '/a.md')).toHaveLength(1)
  })
})

describe('updateOpenFilePath', () => {
  it('重命名 tab 路径', () => {
    const r = updateOpenFilePath([f('/old.md')], '/old.md', '/new.md', 'new.md')
    expect(r[0].path).toBe('/new.md')
    expect(r[0].name).toBe('new.md')
  })
})

describe('removeOpenFilesByPath', () => {
  it('删除后无 tab', () => {
    expect(removeOpenFilesByPath([f('/a.md')], '/a.md')).toHaveLength(0)
  })
})

describe('anyDirty', () => {
  it('有 dirty 为 true', () => {
    expect(anyDirty([f('/a.md', true)])).toBe(true)
  })

  it('全 clean 为 false', () => {
    expect(anyDirty([f('/a.md')])).toBe(false)
  })
})

describe('nextActiveAfterClose', () => {
  it('关闭当前 tab 选中相邻', () => {
    const files = [f('/a.md'), f('/b.md'), f('/c.md')]
    expect(nextActiveAfterClose(files, '/b.md', '/b.md')).toBe('/c.md')
  })

  it('关闭非当前 tab 保持 active', () => {
    const files = [f('/a.md'), f('/b.md')]
    expect(nextActiveAfterClose(files, '/b.md', '/a.md')).toBe('/a.md')
  })
})
