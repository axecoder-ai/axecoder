import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { executeAgentTool } from '../../../electron/main/agent/tool-executor'
import {
  countTextUnits,
  extractChapterSection,
  extractKeyPoints,
  runExpandChapter,
} from '../../../electron/main/agent/tools-complex/expand-chapter'

describe('extractChapterSection', () => {
  const md = `# 前言

简介

## 技术方案

要点A。

### 子节

细节。

## 商务报价

价格。`

  it('按标题定位章节', () => {
    const sec = extractChapterSection(md, '技术方案')
    expect(sec.ok).toBe(true)
    if (!sec.ok) return
    expect(sec.heading).toBe('技术方案')
    expect(sec.body).toContain('要点A')
    expect(sec.body).toContain('子节')
    expect(sec.body).not.toContain('商务报价')
  })

  it('找不到章节', () => {
    const sec = extractChapterSection(md, '不存在')
    expect(sec.ok).toBe(false)
  })
})

describe('extractKeyPoints', () => {
  it('子标题拆要点', () => {
    const pts = extractKeyPoints('### 甲\n内容甲\n\n### 乙\n内容乙')
    expect(pts.length).toBeGreaterThanOrEqual(2)
  })
})

describe('countTextUnits', () => {
  it('忽略空白', () => {
    expect(countTextUnits('a b\n\tc')).toBe(3)
  })
})

describe('runExpandChapter / executeAgentTool ExpandChapter', () => {
  let tmpDir = ''

  beforeEach(async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'wc-expand-'))
    await fs.writeFile(
      path.join(tmpDir, 'doc.md'),
      `# 标书

## 实施计划

现有内容较短。

- 工期
- 人员`,
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
      name: 'ExpandChapter',
      arguments: { file_path: 'doc.md' },
    })
    expect(res.kind).toBe('immediate')
    if (res.kind === 'immediate') {
      expect(res.log.ok).toBe(false)
      expect(res.content).toContain('chapter_heading')
    }
  })

  it('成功返回工作流与要点', async () => {
    const res = await runExpandChapter({
      projectRoot: tmpDir,
      filePath: 'doc.md',
      chapterHeading: '实施计划',
      targetWordCount: 500,
      outputFormat: 'list',
      requirements: '语气正式',
    })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(res.content).toContain('关键要点')
    expect(res.content).toContain('目标字数: 500')
    expect(res.content).toContain('语气正式')
    expect(res.content).toContain('工期')
  })

  it('根外路径失败', async () => {
    const res = await runExpandChapter({
      projectRoot: tmpDir,
      filePath: '/etc/passwd',
      chapterHeading: '实施计划',
      outputFormat: 'auto',
      requirements: '',
    })
    expect(res.ok).toBe(false)
    if (res.ok) return
    expect(res.error).toContain('outside project')
  })
})
