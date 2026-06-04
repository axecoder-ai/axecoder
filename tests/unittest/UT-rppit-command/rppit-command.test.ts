import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import {
  applyRppitModeToLastUserMessage,
  setRppitCommandPathsForTests,
  wrapUserMessageAsRppitCommand,
} from '../../../electron/main/agent/rppit-command'

describe('rppit-command', () => {
  afterEach(() => {
    setRppitCommandPathsForTests(null)
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
})
