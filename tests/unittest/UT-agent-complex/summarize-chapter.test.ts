import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { executeAgentTool } from '../../../electron/main/agent/tool-executor'
import { runSummarizeChapter } from '../../../electron/main/agent/tools-complex/summarize-chapter'

describe('runSummarizeChapter / executeAgentTool SummarizeChapter', () => {
  let tmpDir = ''

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wc-summarize-'))
    await fs.writeFile(
      path.join(tmpDir, 'doc.md'),
      `# 标书

## 实施方案

段落一很乱很长。

### 子标题甲
细节甲。

### 子标题乙
细节乙。

## 其他章节

无关。`,
      'utf-8',
    )
  })

  afterEach(async () => {
    if (tmpDir) await fs.rm(tmpDir, { recursive: true, force: true })
  })

  it('参数缺失失败', async () => {
    const ctx = { projectRoot: tmpDir, readCache: new Set<string>() }
    const res = await executeAgentTool(ctx, {
      id: 'tc1',
      name: 'SummarizeChapter',
      arguments: { file_path: 'doc.md' },
    })
    expect(res.kind).toBe('immediate')
    if (res.kind === 'immediate') {
      expect(res.log.ok).toBe(false)
      expect(res.content).toContain('chapter_heading')
    }
  })

  it('成功返回编号要点', async () => {
    const res = await runSummarizeChapter({
      projectRoot: tmpDir,
      filePath: 'doc.md',
      chapterHeading: '实施方案',
      focus: '关注交付',
    })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.content).toContain('核心要点')
    expect(res.content).toMatch(/^1\./m)
    expect(res.content).toContain('关注交付')
    expect(res.content).not.toContain('其他章节')
  })

  it('max_points 限制条数', async () => {
    const res = await runSummarizeChapter({
      projectRoot: tmpDir,
      filePath: 'doc.md',
      chapterHeading: '实施方案',
      maxPoints: 1,
    })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.content).toContain('提炼要点数: 1')
  })

  it('根外路径失败', async () => {
    const res = await runSummarizeChapter({
      projectRoot: tmpDir,
      filePath: '/etc/passwd',
      chapterHeading: '实施方案',
    })
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.error).toContain('outside project')
  })

  it('找不到章节', async () => {
    const res = await runSummarizeChapter({
      projectRoot: tmpDir,
      filePath: 'doc.md',
      chapterHeading: '不存在',
    })
    expect(res.ok).toBe(false)
  })
})
