export type ModelProvider = 'openai' | 'ollama' | 'anthropic'

export type ModelEntry = {
  id: string
  name: string
  provider: ModelProvider
  /** 深度任务 API 模型名 */
  modelId: string
  /** 简单问答/子任务 API 模型名；空则与 modelId 相同 */
  fastApiModelId?: string
  baseUrl: string
  enabled: boolean
  /** 支持接收用户消息中的图片（多模态） */
  supportsVision?: boolean
}

export type AiChatImagePart = {
  mimeType: string
  /** base64，不含 data: 前缀 */
  data: string
}

export type ModelsFile = {
  schemaVersion: 1
  activeModelId: string
  models: ModelEntry[]
}

export type AppLocale = 'en' | 'zh-CN'

export type AppTheme = 'vscode' | 'aura-light' | 'aura-dark'

/** Claude Code built-in output styles (`outputStyles.ts`) */
export type AgentOutputStyleId = 'default' | 'Explanatory' | 'Learning'

export type AppConfig = {
  schemaVersion: 1
  /** UI locale (renderer + main-process messages) */
  locale?: AppLocale
  autoSave: boolean
  autoSaveDelay: number
  fontSize: number
  theme: AppTheme
  /** Agent Write/Edit/Delete/Move 不经confirm直接写盘 */
  agentAutoApplyWrites: boolean
  /** Agent System提示Output风格（内置 id 或自定义 output-styles 目录中的 slug） */
  agentOutputStyle: string
  /** Wave4：联网Search（需 API Key） */
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
  /** FRC 保留Recent tool 条数 */
  agentFrcKeepToolMessages?: number
  agentTokenBudget?: number
  agentProactiveEnabled?: boolean
  agentHooksEnabled?: boolean
  /** 为 false 时主/子任务均使用 activeModelId */
  agentModelTierRoutingEnabled?: boolean
  /** Agent 任务done时播放提示音 */
  agentCompletionSoundEnabled?: boolean
  /** ~/.axecoder 下音频文件名，如 agent-completion-sound.mp3 */
  agentCompletionSoundPath?: string
  /** 选择文件时的原始文件名（仅展示） */
  agentCompletionSoundDisplayName?: string
  /** Settings Rules 页：是否导入第三方 Plugins/Skills 配置（V1 仅占位） */
  rulesIncludeThirdPartyPlugins?: boolean
  /** Settings侧栏个人资料昵称 */
  profileDisplayName?: string
  /** ~/.axecoder 下头像相对路径 */
  profileAvatarPath?: string
}

export type AiChatMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
  /** 仅 user 消息：粘贴/附件图片 */
  images?: AiChatImagePart[]
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
