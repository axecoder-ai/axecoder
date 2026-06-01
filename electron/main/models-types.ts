export type ModelProvider = 'openai' | 'ollama' | 'anthropic'

export type ModelEntry = {
  id: string
  name: string
  provider: ModelProvider
  modelId: string
  baseUrl: string
  enabled: boolean
}

export type ModelsFile = {
  schemaVersion: 1
  activeModelId: string
  models: ModelEntry[]
}

export type AppTheme = 'vscode' | 'aura-light' | 'aura-dark'

/** Claude Code built-in output styles (`outputStyles.ts`) */
export type AgentOutputStyleId = 'default' | 'Explanatory' | 'Learning'

export type AppConfig = {
  schemaVersion: 1
  autoSave: boolean
  autoSaveDelay: number
  fontSize: number
  theme: AppTheme
  /** Agent Write/Edit/Delete/Move 不经确认直接写盘 */
  agentAutoApplyWrites: boolean
  /** Agent 系统提示输出风格（内置 id 或自定义 output-styles 目录中的 slug） */
  agentOutputStyle: string
  /** Wave4：联网搜索（需 API Key） */
  agentFeatureWebSearch?: boolean
  agentWebSearchApiKey?: string
  agentFeatureLsp?: boolean
  agentFeatureWorktree?: boolean
  agentFeatureSleep?: boolean
  agentFeatureBrief?: boolean
  agentFeatureWorkflow?: boolean
  /** default | acceptEdits | bypassPermissions */
  agentPermissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions'
  agentAllowedTools?: string[]
  agentDisallowedTools?: string[]
  /** 上下文字符阈值，超过则自动 compact */
  agentContextCompactThreshold?: number
  /** FRC 保留最近 tool 条数 */
  agentFrcKeepToolMessages?: number
  agentTokenBudget?: number
  agentProactiveEnabled?: boolean
  agentHooksEnabled?: boolean
}

export type AiChatMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
  /** DeepSeek 等思考模式：下一轮须原样回传 */
  reasoningContent?: string
}

export type AiChatResult =
  | { ok: true; text: string; content: string; reasoningContent?: string }
  | { ok: false; error: string }

export type ModelSaveInput = ModelEntry & { apiKey?: string }

export const defaultBaseUrl = (provider: ModelProvider): string => {
  if (provider === 'openai') return 'https://api.openai.com/v1'
  if (provider === 'ollama') return 'http://127.0.0.1:11434'
  return 'https://api.anthropic.com'
}

export const isAllowedBaseUrl = (url: string): boolean => {
  try {
    const u = new URL(url.trim())
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
