import { describe, expect, it, vi, beforeEach } from 'vitest'

vi.mock('../../../electron/main/rg-files', () => ({
  runRipgrepFiles: vi.fn(),
}))

import { runRipgrepFiles } from '../../../electron/main/rg-files'
import { GLOB_MAX_PATHS, globProject } from '../../../electron/main/agent/agent-fs'

const mockRunRipgrepFiles = vi.mocked(runRipgrepFiles)

describe('globProject', () => {
  beforeEach(() => {
    mockRunRipgrepFiles.mockReset()
  })

  it('空 pattern 返回错误', async () => {
    const res = await globProject('/proj', '  ')
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toContain('Empty')
  })

  it('返回相对路径列表', async () => {
    mockRunRipgrepFiles.mockResolvedValue([
      '/proj/背景资料/参数.md',
      '/proj/README.md',
    ])
    const res = await globProject('/proj', '**/*.md')
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.text).toContain('背景资料/参数.md')
      expect(res.text).toContain('README.md')
    }
  })

  it('超过上限时截断并注明', async () => {
    const many = Array.from({ length: GLOB_MAX_PATHS + 3 }, (_, i) => `/proj/f${i}.md`)
    mockRunRipgrepFiles.mockResolvedValue(many)
    const res = await globProject('/proj', '**/*')
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.text).toContain(`Truncated`)
      expect(res.text).toContain(String(GLOB_MAX_PATHS + 3))
    }
  })

  it('无匹配时提示', async () => {
    mockRunRipgrepFiles.mockResolvedValue([])
    const res = await globProject('/proj', '**/none.md')
    expect(res.ok).toBe(true)
    if (res.ok) expect(res.text).toContain('No files found')
  })
})
