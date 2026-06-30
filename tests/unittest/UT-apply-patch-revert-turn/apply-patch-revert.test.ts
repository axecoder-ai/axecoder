import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { planUnifiedPatch } from '../../../electron/main/agent/apply-patch'
import { revertFileWithPatch } from '../../../electron/main/agent/agent-revert'
import { patchToUnifiedDiff } from '../../../electron/main/agent/edit-utils'
import { resolvePathInProject } from '../../../electron/main/agent/agent-path'

describe('planUnifiedPatch', () => {
  let root = ''
  let filePath = ''

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'ax-patch-'))
    filePath = path.join(root, 'a.txt')
    await fs.writeFile(filePath, 'hello\nworld\n', 'utf-8')
  })

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true })
  })

  it('单文件 patch 规划成功', async () => {
    const patch = patchToUnifiedDiff('a.txt', 'hello\nworld\n', 'hello\nthere\n')
    const res = await planUnifiedPatch((rel) => resolvePathInProject(root, rel), patch)
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.files).toHaveLength(1)
      expect(res.files[0]!.newContent).toBe('hello\nthere\n')
    }
  })

  it('hunk 不匹配时失败', async () => {
    const patch = patchToUnifiedDiff('a.txt', 'nope\n', 'hello\n')
    const res = await planUnifiedPatch((rel) => resolvePathInProject(root, rel), patch)
    expect(res.ok).toBe(false)
  })

  it('空 patch 失败', async () => {
    const res = await planUnifiedPatch((rel) => resolvePathInProject(root, rel), '')
    expect(res.ok).toBe(false)
  })
})

describe('revertFileWithPatch', () => {
  let root = ''
  let rel = 'b.txt'

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'ax-revert-'))
  })

  afterEach(async () => {
    await fs.rm(root, { recursive: true, force: true })
  })

  it('apply 后 revert 还原内容', async () => {
    const abs = path.join(root, rel)
    const before = 'alpha\nbeta\n'
    const after = 'alpha\ngamma\n'
    await fs.writeFile(abs, before, 'utf-8')
    const patch = patchToUnifiedDiff(rel, before, after)
    await fs.writeFile(abs, after, 'utf-8')

    const res = await revertFileWithPatch(root, rel, patch)
    expect(res.ok).toBe(true)
    const text = await fs.readFile(abs, 'utf-8')
    expect(text).toBe(before)
  })
})

describe('executeAgentTool ApplyPatch', () => {
  it('空 patch 立即失败', async () => {
    const { executeAgentTool } = await import('../../../electron/main/agent/tool-executor')
    const ctx = { projectRoot: '/proj', readCache: new Set<string>() }
    const res = await executeAgentTool(ctx, {
      id: 'tc-ap',
      name: 'ApplyPatch',
      arguments: { patch: '' },
    })
    expect(res.kind).toBe('immediate')
    if (res.kind === 'immediate') {
      expect(res.log.ok).toBe(false)
    }
  })
})
