import type { ModelTaskKind } from '../ai/model-resolve'
import {
  CC_BUILTIN_SUBAGENT_TYPES,
  getSubagentTypeConfig,
  isBuiltinSubagentType,
  type CcSubagentType,
  type SubagentTypeConfig,
} from './agent-subagent-types'
import { findCustomSubagentByName, listCustomSubagentFileNames } from '../subagents/subagents-store'

export type ResolvedSubagentExecution =
  | {
      kind: 'builtin'
      type: CcSubagentType
      cfg: SubagentTypeConfig
      customOverride: false
    }
  | {
      kind: 'custom'
      name: string
      promptPrefix: string
      readOnly: boolean
      model?: string
      isBackground: boolean
      maxTurns: number
      modelTaskKind: ModelTaskKind
      customOverride: true
    }

const CUSTOM_DEFAULT_TURNS = 12

export const resolveSubagentForExecution = async (
  projectRoot: string,
  rawType: string,
  readonlyFlag?: boolean,
): Promise<ResolvedSubagentExecution> => {
  const trimmed = rawType.trim()
  const custom = await findCustomSubagentByName(projectRoot, trimmed)
  if (custom) {
    const ro = readonlyFlag === true || custom.readOnly
    return {
      kind: 'custom',
      name: custom.name,
      promptPrefix: custom.body.trim(),
      readOnly: ro,
      model: custom.model !== 'inherit' ? custom.model : undefined,
      isBackground: custom.isBackground,
      maxTurns: CUSTOM_DEFAULT_TURNS,
      modelTaskKind: ro ? 'subagent' : 'main',
      customOverride: true,
    }
  }
  const type = normalizeBuiltinType(trimmed)
  const cfg = getSubagentTypeConfig(type)
  return { kind: 'builtin', type, cfg, customOverride: false }
}

const normalizeBuiltinType = (raw: string): CcSubagentType => {
  const t = raw.trim().toLowerCase()
  if ((CC_BUILTIN_SUBAGENT_TYPES as readonly string[]).includes(t)) {
    return t as CcSubagentType
  }
  return 'generalPurpose'
}

export const listCustomSubagentNames = listCustomSubagentFileNames

export { isBuiltinSubagentType }
