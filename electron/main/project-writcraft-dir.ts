import fs from 'node:fs/promises'
import path from 'node:path'
import { isPathInsideRoot } from './fs-utils'

const SAFE_SESSION_ID = /^[\w-]+$/

export const normalizeProjectRoot = async (projectRoot: string): Promise<string | null> => {
  const trimmed = projectRoot?.trim()
  if (!trimmed) return null
  const root = path.resolve(trimmed)
  if (!path.isAbsolute(root)) return null
  try {
    const st = await fs.stat(root)
    if (!st.isDirectory()) return null
  } catch {
    return null
  }
  return root
}

export const projectSessionsDir = (projectRoot: string) =>
  path.join(path.resolve(projectRoot), '.writcraft', 'sessions')

export const projectSessionsIndexPath = (projectRoot: string) =>
  path.join(projectSessionsDir(projectRoot), 'index.json')

export const projectSessionFilePath = (projectRoot: string, sessionId: string) => {
  if (!SAFE_SESSION_ID.test(sessionId)) {
    throw new Error('invalid session id')
  }
  const dir = projectSessionsDir(projectRoot)
  const file = path.resolve(dir, `${sessionId}.json`)
  if (!isPathInsideRoot(dir, file)) {
    throw new Error('invalid session path')
  }
  return file
}

export const ensureProjectSessionsDir = async (projectRoot: string) => {
  await fs.mkdir(projectSessionsDir(projectRoot), { recursive: true })
}
