import { describe, expect, it } from 'vitest'
import {
  backgroundIncludeStorageKey,
  dedupePaths,
  isAiContextAllowed,
  mergeIncludedWithDefaults,
  parseBackgroundManifest,
  resolveRelativePath,
} from '../../../src/utils/background-materials'

describe('background-materials', () => {
  it('扩展名是否允许带入 AI', () => {
    expect(isAiContextAllowed('参数.md')).toBe(true)
    expect(isAiContextAllowed('note.txt')).toBe(true)
    expect(isAiContextAllowed('config.json')).toBe(true)
    expect(isAiContextAllowed('招标.pdf')).toBe(false)
    expect(isAiContextAllowed('file.docx')).toBe(false)
  })

  it('解析合法 manifest', () => {
    const res = parseBackgroundManifest({
      version: 1,
      categories: [
        { id: 'params', label: '参数', paths: ['未来资料/参数.md'], globs: [] },
      ],
    })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.manifest.categories).toHaveLength(1)
      expect(res.manifest.categories[0].label).toBe('参数')
    }
  })

  it('解析 manifest 中的 projectInfo', () => {
    const res = parseBackgroundManifest({
      version: 1,
      projectInfo: {
        projectName: '平台项目',
        purchaser: '市财政局',
        projectAmount: '100万',
        servicePeriod: '90天',
        warranty: '1年',
      },
      categories: [{ id: 'tender', label: '招标文件', paths: [], globs: [] }],
    })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.manifest.projectInfo?.projectName).toBe('平台项目')
      expect(res.manifest.projectInfo?.purchaser).toBe('市财政局')
      expect(res.manifest.projectInfo?.servicePeriod).toBe('90天')
    }
  })

  it('解析 manifest 中的 parameters 数组', () => {
    const res = parseBackgroundManifest({
      version: 1,
      parameters: [
        { id: '1', label: '参数1', title: '标题一', status: 'responded', sourcePath: '背景资料/参数.md' },
        { id: '2', label: '参数2', title: '标题二', status: 'pending' },
      ],
      categories: [{ id: 'params', label: '参数', paths: [], globs: [] }],
    })
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.manifest.parameters).toHaveLength(2)
      expect(res.manifest.parameters?.[0].status).toBe('responded')
      expect(res.manifest.parameters?.[1].status).toBe('pending')
    }
  })

  it('非法 manifest 缺 categories', () => {
    const res = parseBackgroundManifest({ version: 1 })
    expect(res.ok).toBe(false)
    if (!res.ok) expect(res.error).toContain('categories')
  })

  it('非法 manifest 非对象', () => {
    expect(parseBackgroundManifest(null).ok).toBe(false)
    expect(parseBackgroundManifest('x').ok).toBe(false)
  })

  it('paths 去重', () => {
    expect(dedupePaths(['/a/x.md', '/a/x.md', '/a/y.md'])).toEqual(['/a/x.md', '/a/y.md'])
  })

  it('相对路径解析拒绝逃逸', () => {
    const root = '/proj/BIAOSHU'
    expect(resolveRelativePath(root, '未来资料/参数.md')).toBe('/proj/BIAOSHU/未来资料/参数.md')
    expect(resolveRelativePath(root, '../etc/passwd')).toBeNull()
  })

  it('localStorage key', () => {
    expect(backgroundIncludeStorageKey('/proj/BIAOSHU')).toBe('writcraft.background.include./proj/BIAOSHU')
  })

  it('首次加载默认不勾选（不自动带入聊天）', () => {
    const allAi = ['/a/参数.md']
    expect(mergeIncludedWithDefaults(null, allAi)).toEqual([])
  })

  it('已有勾选时保留交集', () => {
    const stored = ['/a/参数.md', '/a/removed.md']
    const all = ['/a/参数.md', '/a/新.md']
    expect(mergeIncludedWithDefaults(stored, all)).toEqual(['/a/参数.md'])
  })
})
