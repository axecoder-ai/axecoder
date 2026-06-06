import { describe, expect, it } from 'vitest'
import {
  isPidAlive,
  normalizeProjectRoot,
  projectLockKey,
} from '../../../electron/main/project-lock'
import { parseStartupProjectPath } from '../../../electron/main/startup-args'
import path from 'node:path'
import os from 'node:os'

describe('normalizeProjectRoot', () => {
  it('解析为绝对路径', () => {
    const p = normalizeProjectRoot('./foo')
    expect(path.isAbsolute(p)).toBe(true)
  })
})

describe('projectLockKey', () => {
  it('同一路径得到相同 key', () => {
    const a = projectLockKey('/tmp/proj')
    const b = projectLockKey('/tmp/proj')
    expect(a).toBe(b)
    expect(a).toHaveLength(64)
  })
})

describe('isPidAlive', () => {
  it('当前进程存活', () => {
    expect(isPidAlive(process.pid)).toBe(true)
  })

  it('极大 pid 视为不存活', () => {
    expect(isPidAlive(2_000_000_000)).toBe(false)
  })
})

describe('parseStartupProjectPath', () => {
  it('识别目录参数', () => {
    const dir = os.tmpdir()
    const got = parseStartupProjectPath(['electron', '/ignored', dir])
    expect(got).toBe(path.resolve(dir))
  })

  it('无目录时返回 undefined', () => {
    expect(parseStartupProjectPath(['--flag', 'electron'])).toBeUndefined()
  })
})
