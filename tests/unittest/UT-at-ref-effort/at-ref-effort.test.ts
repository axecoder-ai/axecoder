import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { parseAtRefTokens, activeAtRefToken } from '../../../shared/at-ref-parse'
import {
  normalizeReasoningEffort,
  reasoningEffortForApi,
  REASONING_EFFORT_LEVELS,
} from '../../../shared/reasoning-effort'
import { expandAtRefs } from '../../../electron/main/agent/agent-at-refs'

describe('at-ref-parse', () => {
  it('parses deduped tokens', () => {
    expect(parseAtRefTokens('see @src/a.ts and @src/a.ts, @README.md')).toEqual([
      'src/a.ts',
      'README.md',
    ])
  })

  it('activeAtRefToken at cursor', () => {
    const text = 'fix @src/foo'
    const t = activeAtRefToken(text, text.length)
    expect(t?.token).toBe('src/foo')
    expect(t?.start).toBe(4)
  })
})

describe('reasoning-effort', () => {
  it('normalizes levels', () => {
    expect(normalizeReasoningEffort('HIGH')).toBe('high')
    expect(normalizeReasoningEffort('')).toBe('medium')
    expect(normalizeReasoningEffort('nope')).toBe('medium')
  })

  it('maps api field', () => {
    expect(reasoningEffortForApi('auto')).toBeUndefined()
    expect(reasoningEffortForApi('max')).toBe('max')
    expect(REASONING_EFFORT_LEVELS).toContain('medium')
  })
})

describe('expandAtRefs', () => {
  let tmp = ''

  beforeEach(async () => {
    tmp = await fs.mkdtemp(path.join(os.tmpdir(), 'ax-at-ref-'))
    await fs.writeFile(path.join(tmp, 'hello.txt'), 'hello world', 'utf-8')
  })

  afterEach(async () => {
    if (tmp) await fs.rm(tmp, { recursive: true, force: true })
  })

  it('injects file block for existing path', async () => {
    const res = await expandAtRefs(tmp, 'please read @hello.txt')
    expect(res.resolvedCount).toBe(1)
    expect(res.text).toContain('<file path="hello.txt">')
    expect(res.text).toContain('hello world')
  })

  it('ignores non-existent @tokens', async () => {
    const line = 'email user@example.com'
    const res = await expandAtRefs(tmp, line)
    expect(res.resolvedCount).toBe(0)
    expect(res.text).toBe(line)
  })
})
