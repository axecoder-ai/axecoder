import fs from 'node:fs/promises'
import path from 'node:path'
import crypto from 'node:crypto'
import { app } from 'electron'

export type ProjectLockRecord = {
  pid: number
  rootPath: string
  at: string
}

let heldRootPath: string | null = null

const lockDir = () => path.join(app.getPath('userData'), 'project-locks')

export const normalizeProjectRoot = (rootPath: string): string => {
  let resolved = path.resolve(rootPath)
  if (process.platform === 'win32') resolved = resolved.toLowerCase()
  return resolved
}

export const projectLockKey = (rootPath: string): string =>
  crypto.createHash('sha256').update(normalizeProjectRoot(rootPath)).digest('hex')

const lockFileForRoot = (rootPath: string) =>
  path.join(lockDir(), `${projectLockKey(rootPath)}.lock`)

export const isPidAlive = (pid: number): boolean => {
  if (!Number.isInteger(pid) || pid <= 0) return false
  try {
    process.kill(pid, 0)
    return true
  } catch {
    return false
  }
}

export const readProjectLock = async (rootPath: string): Promise<ProjectLockRecord | null> => {
  try {
    const raw = await fs.readFile(lockFileForRoot(rootPath), 'utf-8')
    const parsed = JSON.parse(raw) as ProjectLockRecord
    if (!parsed?.pid || !parsed?.rootPath) return null
    return parsed
  } catch {
    return null
  }
}

export const getHeldProjectRoot = () => heldRootPath

export type AcquireProjectLockResult =
  | { ok: true }
  | { ok: false; reason: 'held'; holder: ProjectLockRecord }

export const acquireProjectLock = async (
  rootPath: string,
): Promise<AcquireProjectLockResult> => {
  const normalized = normalizeProjectRoot(rootPath)
  await fs.mkdir(lockDir(), { recursive: true })

  const existing = await readProjectLock(normalized)
  if (existing && existing.pid !== process.pid && isPidAlive(existing.pid)) {
    return { ok: false, reason: 'held', holder: existing }
  }

  if (heldRootPath && heldRootPath !== normalized) {
    await releaseProjectLock(heldRootPath)
  }

  const record: ProjectLockRecord = {
    pid: process.pid,
    rootPath: normalized,
    at: new Date().toISOString(),
  }
  await fs.writeFile(lockFileForRoot(normalized), JSON.stringify(record), 'utf-8')
  heldRootPath = normalized
  return { ok: true }
}

export const releaseProjectLock = async (rootPath: string): Promise<void> => {
  const normalized = normalizeProjectRoot(rootPath)
  const existing = await readProjectLock(normalized)
  if (existing?.pid === process.pid) {
    await fs.unlink(lockFileForRoot(normalized)).catch(() => {})
  }
  if (heldRootPath === normalized) heldRootPath = null
}

export const releaseHeldProjectLock = async (): Promise<void> => {
  if (!heldRootPath) return
  await releaseProjectLock(heldRootPath)
}
