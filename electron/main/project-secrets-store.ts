import fs from 'node:fs/promises'
import path from 'node:path'

const secretsPath = (projectRoot: string) =>
  path.join(path.resolve(projectRoot), '.axecoder', 'secrets.json')

export const getProjectSecret = async (projectRoot: string, key: string): Promise<string> => {
  if (!projectRoot?.trim()) return ''
  try {
    const raw = await fs.readFile(secretsPath(projectRoot), 'utf-8')
    const data = JSON.parse(raw) as Record<string, string>
    return typeof data === 'object' && data ? (data[key] ?? '') : ''
  } catch {
    return ''
  }
}

export const setProjectSecret = async (
  projectRoot: string,
  key: string,
  value: string,
): Promise<void> => {
  if (!projectRoot?.trim()) throw new Error('projectRoot required')
  const dir = path.join(path.resolve(projectRoot), '.axecoder')
  await fs.mkdir(dir, { recursive: true })
  const file = secretsPath(projectRoot)
  let all: Record<string, string> = {}
  try {
    const raw = await fs.readFile(file, 'utf-8')
    const data = JSON.parse(raw) as Record<string, string>
    if (data && typeof data === 'object') all = data
  } catch {
    /* new file */
  }
  if (value.trim()) all[key] = value.trim()
  else delete all[key]
  await fs.writeFile(file, JSON.stringify(all, null, 2), 'utf-8')
  await fs.chmod(file, 0o600)
}
