import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { setAxecoderDirForTests } from '../../../electron/main/axecoder-dir'
import {
  listRules,
  saveRule,
  deleteRule,
  loadAlwaysApplyRulesPrompt,
} from '../../../electron/main/rules/rules-store'

let tmpHome = ''
let tmpProject = ''

beforeEach(async () => {
  tmpHome = await fs.mkdtemp(path.join(os.tmpdir(), 'wc-rules-home-'))
  tmpProject = await fs.mkdtemp(path.join(os.tmpdir(), 'wc-rules-proj-'))
  setAxecoderDirForTests(tmpHome)
})

afterEach(async () => {
  setAxecoderDirForTests(null)
  await fs.rm(tmpHome, { recursive: true, force: true })
  await fs.rm(tmpProject, { recursive: true, force: true })
})

describe('rules-store', () => {
  it('用户规则 CRUD', async () => {
    await saveRule({
      scope: 'user',
      fileName: '',
      description: '中文回答',
      alwaysApply: true,
      body: '用中文',
      isNew: true,
    })
    let data = await listRules()
    expect(data.rules.some((r) => r.description === '中文回答')).toBe(true)
    const item = data.rules.find((r) => r.description === '中文回答')!
    await deleteRule('user', item.fileName)
    data = await listRules()
    expect(data.rules.some((r) => r.description === '中文回答')).toBe(false)
  })

  it('项目规则写入 .cursor/rules', async () => {
    await saveRule({
      scope: 'project',
      fileName: '',
      description: '项目规范',
      alwaysApply: false,
      body: '遵守 lint',
      projectRoot: tmpProject,
      isNew: true,
    })
    const file = path.join(tmpProject, '.cursor', 'rules')
    const names = await fs.readdir(file)
    expect(names.some((n) => n.endsWith('.mdc'))).toBe(true)
  })

  it('loadAlwaysApplyRulesPrompt 仅含 alwaysApply', async () => {
    await saveRule({
      scope: 'user',
      fileName: '',
      description: '始终',
      alwaysApply: true,
      body: '规则 A',
      isNew: true,
    })
    await saveRule({
      scope: 'user',
      fileName: '',
      description: '手动',
      alwaysApply: false,
      body: '规则 B',
      isNew: true,
    })
    const prompt = await loadAlwaysApplyRulesPrompt(tmpProject)
    expect(prompt).toContain('规则 A')
    expect(prompt).not.toContain('规则 B')
  })
})
