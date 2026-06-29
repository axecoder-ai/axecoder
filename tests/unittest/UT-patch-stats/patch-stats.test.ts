import { describe, expect, it } from 'vitest'
// @ts-ignore
import { createPatch } from 'diff'
import { contentsForReviewDiff, countPatchLineStats } from '../../../src/utils/patch-stats'

describe('contentsForReviewDiff', () => {
  it('新文件：左侧空、右侧为新内容', () => {
    const newContent = 'package main\n\nfunc main() {}\n'
    const patch = createPatch('hello.go', '', newContent, 'a/hello.go', 'b/hello.go')
    const { original, modified } = contentsForReviewDiff(patch, newContent)
    expect(original).toBe('')
    expect(modified).toBe(newContent)
  })

  it('编辑文件：左侧旧、右侧新', () => {
    const oldContent = 'a\n'
    const newContent = 'a\nb\n'
    const patch = createPatch('f.md', oldContent, newContent, 'a/f.md', 'b/f.md')
    const { original, modified } = contentsForReviewDiff(patch, newContent)
    expect(original).toBe(oldContent)
    expect(modified).toBe(newContent)
  })

  it('reverse 失败时从 patch 正向构建新内容', () => {
    const newContent = 'x\ny\n'
    const patch = createPatch('t.txt', '', newContent, 'a/t.txt', 'b/t.txt')
    const { original, modified } = contentsForReviewDiff(patch, 'stale-on-disk')
    expect(original).toBe('')
    expect(modified).toBe(newContent)
  })
})

describe('countPatchLineStats', () => {
  it('counts + and -', () => {
    const patch = createPatch('f', 'a\n', 'a\nb\n', 'a/f', 'b/f')
    expect(countPatchLineStats(patch)).toEqual({ additions: 1, deletions: 0 })
  })
})
