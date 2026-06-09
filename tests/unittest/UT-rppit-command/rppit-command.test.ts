import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  applyRppitModeToLastUserMessage,
  loadRppitConfig,
  parseDeliverablesRoot,
  setRppitCommandPathsForTests,
  setRppitConfigPathForTests,
  wrapUserMessageAsRppitCommand,
} from '../../../electron/main/agent/rppit-command'

describe('rppit-command', () => {
  afterEach(() => {
    setRppitCommandPathsForTests(null)
    setRppitConfigPathForTests(null)
  })

  it('wrapUserMessageAsRppitCommand matches slash sendPrompt shape', () => {
    const playbook = '# rppit\n\nDo steps.'
    const wrapped = wrapUserMessageAsRppitCommand(playbook, '')
    expect(wrapped).toContain(playbook)
    expect(wrapped).toContain('AxeCoder 运行时')
    expect(wrapped).toContain('/summary')
    const withNotes = wrapUserMessageAsRppitCommand(playbook, 'build login')
    expect(withNotes).toContain('User notes:\nbuild login')
  })

  it('applyRppitModeToLastUserMessage wraps only the last user turn', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rppit-test-'))
    const md = path.join(dir, 'rppit.md')
    await fs.writeFile(md, '# rppit playbook\n\nStep 0.', 'utf-8')
    setRppitCommandPathsForTests([md])

    const messages = [
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'first' },
      { role: 'assistant', content: 'ok' },
      { role: 'user', content: 'second task' },
    ]
    const res = await applyRppitModeToLastUserMessage(messages)
    expect(res.ok).toBe(true)
    expect(messages[1]!.content).toBe('first')
    expect(messages[3]!.content).toContain('# rppit playbook')
    expect(messages[3]!.content).toContain('User notes:\nsecond task')
  })

  it('loadRppitConfig loads valid JSON config', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rppit-cfg-'))
    const cfgPath = path.join(dir, 'rppit.json')
    await fs.writeFile(
      cfgPath,
      JSON.stringify({ deliverables_root: 'docs/features', merged_doc_suffix: '总结' }),
      'utf-8',
    )
    setRppitConfigPathForTests(cfgPath)

    const cfg = await loadRppitConfig()
    expect(cfg.ok).toBe(true)
    if (cfg.ok) {
      expect(cfg.config.deliverables_root).toBe('docs/features')
      expect(cfg.config.merged_doc_suffix).toBe('总结')
    }
  })

  it('loadRppitConfig returns default when file not found', async () => {
    setRppitConfigPathForTests('/nonexistent/rppit.json')
    const cfg = await loadRppitConfig()
    expect(cfg.ok).toBe(true)
    if (cfg.ok) {
      expect(cfg.config.deliverables_root).toBe('docs/deliverables')
      expect(cfg.config.merged_doc_suffix).toBe('交付总结')
    }
  })

  it('loadRppitConfig returns error on invalid JSON', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rppit-bad-'))
    const cfgPath = path.join(dir, 'rppit.json')
    await fs.writeFile(cfgPath, '{ invalid json', 'utf-8')
    setRppitConfigPathForTests(cfgPath)

    const cfg = await loadRppitConfig()
    expect(cfg.ok).toBe(false)
    if (!cfg.ok) {
      expect(cfg.error).toContain('Invalid JSON')
    }
  })

  it('parseDeliverablesRoot: user override > config > default', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'rppit-parse-'))
    const cfgPath = path.join(dir, 'rppit.json')
    await fs.writeFile(cfgPath, JSON.stringify({ deliverables_root: 'docs/output' }), 'utf-8')
    setRppitConfigPathForTests(cfgPath)

    // 用户指定优先级最高
    const res1 = await parseDeliverablesRoot('docs/custom', dir)
    expect(res1).toBe('docs/custom')

    // 无用户指定则读配置
    const res2 = await parseDeliverablesRoot(undefined, dir)
    expect(res2).toBe('docs/output')

    // 配置不存在时使用默认值
    setRppitConfigPathForTests('/nonexistent/rppit.json')
    const res3 = await parseDeliverablesRoot(undefined, dir)
    expect(res3).toBe('docs/deliverables')
  })
})
