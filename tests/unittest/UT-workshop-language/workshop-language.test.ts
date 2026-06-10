import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { setAxecoderDirForTests } from '../../../electron/main/axecoder-dir'
import { invalidateMainLocaleCache, refreshMainLocale } from '../../../electron/main/i18n'
import {
  buildWorkshopRouterSystemPrompt,
  resolveWorkshopReplyLanguage,
  workshopLanguageInstruction,
} from '../../../electron/main/workshop/workshop-language'
import { buildManagerTurnPrompt } from '../../../electron/main/workshop/workshop-router'

const writeConfig = async (testDir: string, locale: string) => {
  await fs.writeFile(
    path.join(testDir, 'config.json'),
    JSON.stringify({ schemaVersion: 1, locale }, null, 2),
    'utf-8',
  )
  invalidateMainLocaleCache()
  await refreshMainLocale()
}

describe('workshop-language', () => {
  let testDir = ''
  let projectRoot = ''

  beforeEach(async () => {
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ws-lang-'))
    projectRoot = path.join(testDir, 'proj')
    await fs.mkdir(projectRoot, { recursive: true })
    setAxecoderDirForTests(testDir)
    invalidateMainLocaleCache()
  })

  afterEach(() => {
    setAxecoderDirForTests(null)
    invalidateMainLocaleCache()
  })

  it('locale zh-CN → 中文', async () => {
    await writeConfig(testDir, 'zh-CN')
    await expect(resolveWorkshopReplyLanguage(projectRoot)).resolves.toBe('中文')
  })

  it('alwaysApply 中文规则优先于 locale en', async () => {
    await writeConfig(testDir, 'en')
    await fs.mkdir(path.join(testDir, 'rules'), { recursive: true })
    await fs.writeFile(
      path.join(testDir, 'rules', 'always-respond-in-中文.mdc'),
      `---
description: Always respond in 中文
alwaysApply: true
---
Always respond in 中文
`,
      'utf-8',
    )
    await expect(resolveWorkshopReplyLanguage(projectRoot)).resolves.toBe('中文')
  })

  it('buildManagerTurnPrompt 使用动态语言', () => {
    const p = buildManagerTurnPrompt('任务', '', [], undefined, '中文')
    expect(p).toContain('message to the group in 中文')
    expect(p).toContain(workshopLanguageInstruction('中文'))
    expect(p).not.toContain('in English')
  })

  it('buildWorkshopRouterSystemPrompt 注入语言与规则', async () => {
    await writeConfig(testDir, 'zh-CN')
    const sys = await buildWorkshopRouterSystemPrompt(projectRoot)
    expect(sys).toContain('Always respond in 中文')
    expect(sys).toContain('Collab Workshop router')
  })
})
