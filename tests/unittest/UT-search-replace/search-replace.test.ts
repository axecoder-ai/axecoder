import { describe, expect, it } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { replaceOneInFile, replaceInLine } from '../../../electron/main/search-utils'
import type { SearchHit } from '../../../electron/main/fs-utils'

describe('search replaceOneInFile', () => {
  it('replaceInLine replaces query on a line', () => {
    expect(replaceInLine('hello world', 'world', 'there')).toBe('hello there')
  })

  it('replaceOneInFile changes only the target line', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'axecoder-r1-'))
    const file = path.join(dir, 'a.txt')
    await fs.writeFile(file, 'line1\nfind me\nline3\n', 'utf-8')
    const hit: SearchHit = { file, line: 2, col: 1, text: 'find me' }
    const res = await replaceOneInFile(dir, hit, 'find me', 'found', {})
    expect(res.ok).toBe(true)
    expect(res.replacements).toBe(1)
    const content = await fs.readFile(file, 'utf-8')
    expect(content).toBe('line1\nfound\nline3\n')
    await fs.rm(dir, { recursive: true, force: true })
  })
})
