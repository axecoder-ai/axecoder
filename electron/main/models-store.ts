import fs from 'node:fs/promises'
import type { ModelEntry, ModelSaveInput, ModelsFile } from './models-types'
import { isAllowedBaseUrl } from './models-types'
import { ensureAxecoderDir, axecoderPath } from './axecoder-dir'
import { deleteSecret, setSecret } from './secrets-store'

const modelsPath = () => axecoderPath('models.json')

const emptyModels = (): ModelsFile => ({
  schemaVersion: 1,
  activeModelId: '',
  models: [],
})

/** 旧版全局 fastModelId（条目 id）→ 当前 active 条目的 fastApiModelId */
const migrateLegacyFastModelId = (
  file: ModelsFile,
  raw: ModelsFile & { fastModelId?: string },
) => {
  const legacyFast = raw.fastModelId?.trim() ?? ''
  if (!legacyFast) return
  const active = file.models.find((m) => m.id === file.activeModelId)
  const fastEntry = file.models.find((m) => m.id === legacyFast)
  if (!active || !fastEntry || active.fastApiModelId?.trim()) return
  active.fastApiModelId = fastEntry.modelId.trim()
}

const readModelsFile = async (): Promise<ModelsFile> => {
  try {
    const raw = await fs.readFile(modelsPath(), 'utf-8')
    const data = JSON.parse(raw) as ModelsFile
    if (!data || data.schemaVersion !== 1 || !Array.isArray(data.models)) return emptyModels()
    const models = (data.models ?? []).map((m) => ({
      ...m,
      fastApiModelId: m.fastApiModelId?.trim() || undefined,
      enabled: m.enabled !== false,
    }))
    const file = {
      schemaVersion: 1 as const,
      activeModelId: data.activeModelId ?? '',
      models,
    }
    migrateLegacyFastModelId(file, data as ModelsFile & { fastModelId?: string })
    return file
  } catch {
    return emptyModels()
  }
}

const writeModelsFile = async (data: ModelsFile) => {
  await ensureAxecoderDir()
  await fs.writeFile(modelsPath(), JSON.stringify(data, null, 2), 'utf-8')
}

export const listModels = async (): Promise<ModelsFile> => readModelsFile()

export const getModelById = async (id: string): Promise<ModelEntry | null> => {
  const data = await readModelsFile()
  return data.models.find((m) => m.id === id) ?? null
}

export const saveModel = async (input: ModelSaveInput): Promise<ModelsFile> => {
  if (!isAllowedBaseUrl(input.baseUrl)) {
    throw new Error('baseUrl must be http or https')
  }
  const data = await readModelsFile()
  const fastApi = input.fastApiModelId?.trim() ?? ''
  const entry: ModelEntry = {
    id: input.id,
    name: input.name.trim(),
    provider: input.provider,
    modelId: input.modelId.trim(),
    ...(fastApi ? { fastApiModelId: fastApi } : {}),
    baseUrl: input.baseUrl.trim().replace(/\/+$/, ''),
    enabled: input.enabled,
  }
  const idx = data.models.findIndex((m) => m.id === entry.id)
  if (idx >= 0) data.models[idx] = entry
  else data.models.push(entry)
  if (!data.activeModelId || !data.models.find((m) => m.id === data.activeModelId)) {
    data.activeModelId = entry.id
  }
  await writeModelsFile(data)
  if (input.apiKey !== undefined) await setSecret(entry.id, input.apiKey)
  return data
}

export const deleteModel = async (id: string): Promise<ModelsFile> => {
  const data = await readModelsFile()
  data.models = data.models.filter((m) => m.id !== id)
  if (data.activeModelId === id) {
    data.activeModelId = data.models.find((m) => m.enabled)?.id ?? data.models[0]?.id ?? ''
  }
  await writeModelsFile(data)
  await deleteSecret(id)
  return data
}

export const toggleModel = async (id: string, enabled: boolean): Promise<ModelsFile> => {
  const data = await readModelsFile()
  const m = data.models.find((x) => x.id === id)
  if (!m) return data
  m.enabled = enabled
  if (!enabled && data.activeModelId === id) {
    data.activeModelId = data.models.find((x) => x.enabled && x.id !== id)?.id ?? ''
  }
  await writeModelsFile(data)
  return data
}

export const setActiveModel = async (id: string): Promise<ModelsFile> => {
  const data = await readModelsFile()
  const m = data.models.find((x) => x.id === id)
  if (!m || !m.enabled) throw new Error('Model not found or not enabled')
  data.activeModelId = id
  await writeModelsFile(data)
  return data
}

export const writeModelsIfMissing = async (data: ModelsFile) => {
  try {
    await fs.access(modelsPath())
  } catch {
    await writeModelsFile(data)
  }
}
