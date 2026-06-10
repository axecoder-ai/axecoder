import { getConfig } from '../config-store'
import { listModels } from '../models-store'
import type { ModelsFile } from '../models-types'

export type ModelTaskKind = 'main' | 'subagent'

/** 同步解析 ModelEntry.id（V2：条目内双 API，不再切换全局 fast 条目） */
export const resolveModelIdFromFile = (
  data: ModelsFile,
  _kind: ModelTaskKind,
  _routingEnabled = true,
): string => {
  return data.activeModelId?.trim() ?? ''
}

export const resolveModelIdForTask = async (kind: ModelTaskKind): Promise<string> => {
  const config = await getConfig()
  const routingEnabled = config.agentModelTierRoutingEnabled !== false
  const data = await listModels()
  return resolveModelIdFromFile(data, kind, routingEnabled)
}

/** Agent 工具子类型 → 档位 */
export const modelTaskKindForSubagentType = (subagentType: string): ModelTaskKind => {
  const t = subagentType.trim()
  if (t === 'explore' || t === 'plan' || t === 'bugbot' || t === 'security-review') return 'subagent'
  return 'main'
}

/** 工坊角色发言 → 档位（经理/实现角色用主模型，QA用快速） */
export const modelTaskKindForWorkshopRole = (
  roleId: string,
  speakMode?: string,
): ModelTaskKind => {
  if (roleId === 'manager') return 'main'
  if (roleId === 'tester') return 'subagent'
  if (speakMode === 'plan' || speakMode === 'verify') return 'main'
  return 'main'
}
