import { describe, expect, it } from 'vitest'
import { resolvePathInProject } from '../../../electron/main/agent/agent-path'

describe('resolvePathInProject', () => {
  const root = '/proj'

  it('绝对路径在根内', () => {
    expect(resolvePathInProject(root, '/proj/a.md')).toBe('/proj/a.md')
  })

  it('相对路径解析到根内', () => {
    expect(resolvePathInProject(root, 'a.md')).toBe('/proj/a.md')
  })

  it('根外返回 null', () => {
    expect(resolvePathInProject(root, '/other/a.md')).toBeNull()
  })

  it('穿越返回 null', () => {
    expect(resolvePathInProject(root, '../etc/passwd')).toBeNull()
  })

  it('其他用户主目录绝对路径返回 null', () => {
    expect(
      resolvePathInProject(root, '/Users/shiyouwu/CodeBuddy/20251230110810/README.md'),
    ).toBeNull()
  })
})
