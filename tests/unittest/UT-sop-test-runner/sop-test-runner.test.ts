import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, describe, expect, it } from 'vitest'
import { detectTestCommand, runProjectTests } from '../../../electron/main/sop/sop-test-runner'

describe('detectTestCommand', () => {
  let dir = ''

  afterEach(async () => {
    if (dir) await fs.rm(dir, { recursive: true, force: true })
    dir = ''
  })

  it('package.json scripts.test', async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sop-test-'))
    await fs.writeFile(
      path.join(dir, 'package.json'),
      JSON.stringify({ scripts: { test: 'vitest run' } }),
      'utf-8',
    )
    expect(await detectTestCommand(dir)).toBe('npm test')
  })

  it('go.mod → go test', async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sop-test-'))
    await fs.writeFile(path.join(dir, 'go.mod'), 'module example.com\n', 'utf-8')
    expect(await detectTestCommand(dir)).toBe('go test ./...')
  })
})

describe('runProjectTests', () => {
  let dir = ''

  afterEach(async () => {
    if (dir) await fs.rm(dir, { recursive: true, force: true })
    dir = ''
  })

  it('mock exec 返回 ok', async () => {
    dir = await fs.mkdtemp(path.join(os.tmpdir(), 'sop-test-'))
    await fs.writeFile(
      path.join(dir, 'package.json'),
      JSON.stringify({ scripts: { test: 'vitest run' } }),
      'utf-8',
    )
    const r = await runProjectTests(dir, async () => ({
      exitCode: 0,
      output: 'ok  3 passed',
    }))
    expect(r.ok).toBe(true)
  })
})
