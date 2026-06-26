import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {
  buildDesignMdAgentRule,
  listAppDesignThemes,
  parseDesignColors,
  runDesignSlash,
} from '../../../electron/main/design/design-slash'

const SAMPLE_DESIGN = `---
version: test
name: Test Theme
colors:
  primary: "#f54e00"
  canvas: "#f7f7f4"
  ink: "#26251e"
typography:
  body-md:
    fontSize: 16px
---
# body
`

let prevAppRoot: string | undefined
let tmpRoot = ''
let tmpProject = ''

beforeEach(async () => {
  prevAppRoot = process.env.APP_ROOT
  tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'wc-design-app-'))
  tmpProject = await fs.mkdtemp(path.join(os.tmpdir(), 'wc-design-proj-'))
  process.env.APP_ROOT = tmpRoot
  await fs.mkdir(path.join(tmpRoot, 'design', 'cursor'), { recursive: true })
  await fs.writeFile(path.join(tmpRoot, 'design', 'cursor', 'DESIGN.md'), SAMPLE_DESIGN, 'utf-8')
  await fs.mkdir(path.join(tmpRoot, 'design', 'figma'), { recursive: true })
  await fs.writeFile(path.join(tmpRoot, 'design', 'figma', 'DESIGN.md'), SAMPLE_DESIGN, 'utf-8')
})

afterEach(async () => {
  if (prevAppRoot === undefined) delete process.env.APP_ROOT
  else process.env.APP_ROOT = prevAppRoot
  await fs.rm(tmpRoot, { recursive: true, force: true })
  await fs.rm(tmpProject, { recursive: true, force: true })
})

describe('parseDesignColors', () => {
  it('解析 YAML colors 段', () => {
    const colors = parseDesignColors(SAMPLE_DESIGN)
    expect(colors.primary).toBe('#f54e00')
    expect(colors.canvas).toBe('#f7f7f4')
    expect(colors.ink).toBe('#26251e')
  })
})

describe('listAppDesignThemes', () => {
  it('列出含 DESIGN.md 的主题目录', async () => {
    const themes = await listAppDesignThemes()
    expect(themes).toContain('cursor')
    expect(themes).toContain('figma')
  })
})

describe('runDesignSlash', () => {
  it('无 DESIGN.md 无参时列出主题', async () => {
    const res = await runDesignSlash(tmpProject, '')
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.message).toContain('cursor')
      expect(res.message).toContain('/design cursor')
    }
  })

  it('无 DESIGN.md 有参时复制到项目根', async () => {
    const res = await runDesignSlash(tmpProject, 'cursor')
    expect(res.ok).toBe(true)
    const raw = await fs.readFile(path.join(tmpProject, 'DESIGN.md'), 'utf-8')
    expect(raw).toContain('Test Theme')
    if (res.ok) expect(res.message).toContain('primary')
  })

  it('已有 DESIGN.md 时展示配色与删除提示', async () => {
    await fs.writeFile(path.join(tmpProject, 'DESIGN.md'), SAMPLE_DESIGN, 'utf-8')
    const res = await runDesignSlash(tmpProject, '')
    expect(res.ok).toBe(true)
    if (res.ok) {
      expect(res.message).toContain('#f54e00')
      expect(res.message).toContain('删除')
    }
  })

  it('未知主题返回错误', async () => {
    const res = await runDesignSlash(tmpProject, 'no-such-theme')
    expect(res.ok).toBe(false)
  })
})

describe('buildDesignMdAgentRule', () => {
  it('无 DESIGN.md 返回 null', async () => {
    expect(await buildDesignMdAgentRule(tmpProject)).toBeNull()
  })

  it('有 DESIGN.md 时注入规则含配色', async () => {
    await fs.writeFile(path.join(tmpProject, 'DESIGN.md'), SAMPLE_DESIGN, 'utf-8')
    const rule = await buildDesignMdAgentRule(tmpProject)
    expect(rule).toContain('project-design-md')
    expect(rule).toContain('#f54e00')
    expect(rule).toContain('DESIGN.md')
  })
})
