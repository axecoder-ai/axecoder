import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { resolveSubagentForExecution } from '../../../electron/main/agent/agent-custom-subagents'
import { isBuiltinSubagentType } from '../../../electron/main/agent/agent-subagent-types'
import {
  parseSubagentFile,
  serializeSubagentFile,
} from '../../../electron/main/subagents/subagents-parse'
import {
  findCustomSubagentByName,
  saveSubagent,
  setUserSubagentsDirForTests,
} from '../../../electron/main/subagents/subagents-store'

describe('subagent-complete', () => {
  let tmpDir = ''

  afterEach(async () => {
    setUserSubagentsDirForTests(null)
    if (tmpDir) {
      await fs.rm(tmpDir, { recursive: true, force: true })
      tmpDir = ''
    }
  })

  it('parseSubagentFile 解析 frontmatter', () => {
    const raw = `---
name: research-codebase
description: "调研专员"
model: inherit
readonly: true
is_background: true
---

你是调研专员。`
    const { frontmatter, body } = parseSubagentFile(raw)
    expect(frontmatter.name).toBe('research-codebase')
    expect(frontmatter.readonly).toBe(true)
    expect(frontmatter.is_background).toBe(true)
    expect(body).toContain('调研专员')
  })

  it('serializeSubagentFile 往返', () => {
    const text = serializeSubagentFile(
      { name: 'x', description: 'desc', readonly: true, is_background: false },
      'body line',
    )
    const parsed = parseSubagentFile(text)
    expect(parsed.frontmatter.name).toBe('x')
    expect(parsed.body).toBe('body line')
  })

  it('自定义 subagent 覆盖内置名', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ax-sub-'))
    setUserSubagentsDirForTests(tmpDir)
    await saveSubagent({
      scope: 'user',
      fileName: '',
      name: 'research-codebase',
      description: 'custom research',
      body: 'CUSTOM_PREFIX',
      readOnly: true,
      model: 'inherit',
      isBackground: false,
      isNew: true,
    })
    const projectRoot = path.join(tmpDir, 'proj')
    await fs.mkdir(projectRoot, { recursive: true })
    const resolved = await resolveSubagentForExecution(projectRoot, 'research-codebase')
    expect(resolved.kind).toBe('custom')
    if (resolved.kind === 'custom') {
      expect(resolved.promptPrefix).toBe('CUSTOM_PREFIX')
      expect(resolved.readOnly).toBe(true)
    }
  })

  it('未知内置名无自定义时回退 generalPurpose', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ax-sub-'))
    const projectRoot = path.join(tmpDir, 'proj')
    await fs.mkdir(projectRoot, { recursive: true })
    const resolved = await resolveSubagentForExecution(projectRoot, 'unknown-xyz')
    expect(resolved.kind).toBe('builtin')
    if (resolved.kind === 'builtin') {
      expect(resolved.type).toBe('generalPurpose')
    }
  })

  it('isBuiltinSubagentType 识别内置', () => {
    expect(isBuiltinSubagentType('explore')).toBe(true)
    expect(isBuiltinSubagentType('research-codebase')).toBe(false)
  })

  it('findCustomSubagentByName 按名称查找', async () => {
    tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ax-sub-'))
    setUserSubagentsDirForTests(tmpDir)
    await saveSubagent({
      scope: 'user',
      fileName: '',
      name: 'my-bot',
      description: 'bot',
      body: 'do work',
      readOnly: false,
      model: 'inherit',
      isBackground: false,
      isNew: true,
    })
    const hit = await findCustomSubagentByName(tmpDir, 'my-bot')
    expect(hit?.name).toBe('my-bot')
    expect(hit?.body).toBe('do work')
  })
})
