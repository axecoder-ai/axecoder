import fs from 'node:fs/promises'
import { ensureWritcraftDir, writcraftPath } from './writcraft-dir'

const secretsPath = () => writcraftPath('secrets.json')

export const readSecrets = async (): Promise<Record<string, string>> => {
  try {
    const raw = await fs.readFile(secretsPath(), 'utf-8')
    const data = JSON.parse(raw) as Record<string, string>
    return data && typeof data === 'object' ? data : {}
  } catch {
    return {}
  }
}

export const writeSecrets = async (secrets: Record<string, string>) => {
  await ensureWritcraftDir()
  await fs.writeFile(secretsPath(), JSON.stringify(secrets, null, 2), 'utf-8')
  await fs.chmod(secretsPath(), 0o600)
}

export const setSecret = async (modelId: string, apiKey: string) => {
  const all = await readSecrets()
  if (apiKey.trim()) all[modelId] = apiKey.trim()
  else delete all[modelId]
  await writeSecrets(all)
}

export const deleteSecret = async (modelId: string) => {
  const all = await readSecrets()
  delete all[modelId]
  await writeSecrets(all)
}

export const getSecret = async (modelId: string): Promise<string> => {
  const all = await readSecrets()
  return all[modelId] ?? ''
}
