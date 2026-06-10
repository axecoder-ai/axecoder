export type {
  ModelProvider,
  AiProviderCapabilities,
} from '../../shared/ai/provider-capabilities'
export {
  providerRequiresApiKey,
  providerSupportsSseStream,
  defaultBaseUrl,
  getProviderCapabilities,
  listAllProviderCapabilities,
} from '../../shared/ai/provider-capabilities'

import type { ModelProvider } from '../../shared/ai/provider-capabilities'

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
  /** Agent Bash OS 沙箱（macOS Seatbelt + execpolicy）；false 时裸执行 */
  agentOsSandboxEnabled?: boolean
  /** Agent System提示Output风格（内置 id 或自定义 output-styles 目录中的 slug） */
  agentOutputStyle: string
  /** Wave4：联网Search（需 Serper API Key） */
  agentFeatureWebSearch?: boolean
  agentWebSearchApiKey?: string
  /** Wave4：Playwright 浏览器自动化 WebRun */
  agentFeatureWebRun?: boolean
  agentFeatureLsp?: boolean
  /** 内置 CodeGraph 代码知识图谱（tree-sitter + SQLite） */
  agentFeatureCodeGraph?: boolean
  agentFeatureWorktree?: boolean
  agentFeatureSleep?: boolean
  agentFeatureBrief?: boolean
  agentFeatureWorkflow?: boolean
  /** default | acceptEdits | bypassPermissions */
  agentPermissionMode?: 'default' | 'acceptEdits' | 'bypassPermissions'
  /** 全局 allow 规则，如 Read、Bash(go test*) */
  agentPermissionAllowRules?: string[]
  agentPermissionAskRules?: string[]
  agentPermissionDenyRules?: string[]
  /** @deprecated 迁移为 agentPermissionAllowRules */
  agentAllowedTools?: string[]
  /** @deprecated 迁移为 agentPermissionDenyRules */
  agentDisallowedTools?: string[]
  /** 上下文字符阈值，超过则自动 compact */
  agentContextCompactThreshold?: number
  /** FRC 保留Recent tool 条数 */
  agentFrcKeepToolMessages?: number
  agentTokenBudget?: number
  agentProactiveEnabled?: boolean
  /** off | on：复杂任务自动进入 plan mode（对齐 Reasonix auto_plan） */
  agentAutoPlan?: 'off' | 'on'
  /** 分类用模型条目 id；空则用当前聊天模型的 fast 档 */
  agentAutoPlanClassifierModelId?: string
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
  /** Git 托管：auto 从 remote 推断 | github | gitee | custom */
  gitForgeProvider?: 'auto' | 'github' | 'gitee' | 'custom'
  /** API 根地址，如 https://gitee.com/api/v5 或企业 GitHub API */
  gitForgeApiBase?: string
  /** Web 根地址，如 https://gitee.com 或 https://git.company.com */
  gitForgeWebBase?: string
  /** GitHub PAT 或 Gitee access token（存本地 config，慎用） */
  gitForgeAccessToken?: string
  /** AI 请求遇 524 / 429 限流时的最大重试次数（不含首次请求） */
  aiRequestMaxRetries?: number
  /** 429 限流重试前等待秒数（默认 60，范围 5–300；优先使用 Retry-After） */
  aiRateLimitRetryDelaySec?: number
  /** Agent loop guard（防呆）：拦截重复失败与重复写操作 */
  agentLoopGuardEnabled?: boolean
  /** 同一错误连续失败多少次后注入 [loop guard]（默认 3） */
  agentLoopGuardStormThreshold?: number
  /** 写操作同参成功多少次后 block 下一次（默认 2，即第 3 次拦） */
  agentLoopGuardRepeatSuccessThreshold?: number
  /** 每轮用户消息内 model↔tool 循环上限；0 = 不限制 */
  agentMaxToolRounds?: number
}

export type AiChatMessage = {
  role: 'user' | 'assistant' | 'system'
  content: string
  /** 仅 user 消息：粘贴/附件图片 */
  images?: AiChatImagePart[]
  /** DeepSeek 等思考模式：下一轮须原样回传 */
  reasoningContent?: string
}

export type AiTokenUsage = {
  promptTokens: number
  completionTokens: number
  estimated: boolean
}

export type AiChatResult =
  | { ok: true; text: string; content: string; reasoningContent?: string; usage?: AiTokenUsage }
  | { ok: false; error: string }

export type ModelSaveInput = ModelEntry & { apiKey?: string }

export const isAllowedBaseUrl = (url: string): boolean => {
  try {
    const u = new URL(url.trim())
    return u.protocol === 'http:' || u.protocol === 'https:'
  } catch {
    return false
  }
}
