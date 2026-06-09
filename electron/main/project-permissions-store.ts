import fs from 'node:fs/promises'
import path from 'node:path'
import type { PermissionsPolicy } from './agent/agent-permission-rules'
import { normalizePermissionModeString } from './agent/agent-permission-rules'

const defaultPolicy = (): PermissionsPolicy => ({
  mode: 'ask',
  allow: [],
  ask: [],
  deny: [],
})

const permissionsPath = (projectRoot: string) =>
  path.join(projectRoot, '.axecoder', 'permissions.json')

const normalizePolicy = (raw: Partial<PermissionsPolicy> | null): PermissionsPolicy => {
  if (!raw) return defaultPolicy()
  return {
    mode: normalizePermissionModeString(raw.mode),
    allow: Array.isArray(raw.allow) ? raw.allow.map(String) : [],
    ask: Array.isArray(raw.ask) ? raw.ask.map(String) : [],
    deny: Array.isArray(raw.deny) ? raw.deny.map(String) : [],
  }
}

export const getProjectPermissions = async (
  projectRoot: string,
): Promise<PermissionsPolicy> => {
  if (!projectRoot?.trim()) return defaultPolicy()
  try {
    const text = await fs.readFile(permissionsPath(projectRoot), 'utf-8')
    return normalizePolicy(JSON.parse(text) as Partial<PermissionsPolicy>)
  } catch {
    return defaultPolicy()
  }
}

export const setProjectPermissions = async (
  projectRoot: string,
  partial: Partial<PermissionsPolicy>,
): Promise<PermissionsPolicy> => {
  if (!projectRoot?.trim()) throw new Error('projectRoot required')
  const dir = path.join(projectRoot, '.axecoder')
  await fs.mkdir(dir, { recursive: true })
  const cur = await getProjectPermissions(projectRoot)
  const next = normalizePolicy({ ...cur, ...partial })
  await fs.writeFile(permissionsPath(projectRoot), `${JSON.stringify(next, null, 2)}\n`, 'utf-8')
  return next
}

export const getProjectPermissionsPath = (projectRoot: string): string =>
  permissionsPath(projectRoot)
