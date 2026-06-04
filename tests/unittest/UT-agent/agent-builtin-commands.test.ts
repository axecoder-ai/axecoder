import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { listBuiltinCommands, loadBuiltinCommand } from '../../../electron/main/agent/agent-builtin-commands'

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..')

describe('agent-builtin-commands', () => {
  let prevAppRoot = process.env.APP_ROOT

  beforeEach(() => {
    prevAppRoot = process.env.APP_ROOT
    process.env.APP_ROOT = projectRoot
  })

  afterEach(() => {
    if (prevAppRoot === undefined) delete process.env.APP_ROOT
    else process.env.APP_ROOT = prevAppRoot
  })

  it('lists built-in workflow commands', async () => {
    const list = await listBuiltinCommands()
    expect(list.map((c) => c.name)).toEqual([
      'research-codebase',
      'make-proposals',
      'make-plan',
      'clarify',
      'create-proposals',
      'create-plan',
      'implement',
      'code-review',
      'design_doc_template',
      'rppit',
      'summary',
    ])
  })

  it('加载 make-proposals 正文', async () => {
    const loaded = await loadBuiltinCommand('make-proposals')
    expect(loaded.ok).toBe(true)
    if (loaded.ok) {
      expect(loaded.text).toContain('Solution Proposal')
      expect(loaded.path).toContain('resources/builtin-commands/make-proposals.md')
    }
  })

  it('未知命令返回错误', async () => {
    const loaded = await loadBuiltinCommand('unknown-cmd')
    expect(loaded.ok).toBe(false)
  })
})
