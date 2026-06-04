import type { AgentToolDef } from './agent-types'
import { buildFullAgentTools, buildSubAgentToolList } from './agent-tool-registry'

export type { AgentToolDef } from './agent-types'

export {
  AGENT_SYSTEM_PROMPT_LEGACY as AGENT_SYSTEM_PROMPT,
  buildAgentSystemPrompt,
  buildDefaultSubAgentSystemPrompt,
  computeSimpleEnvInfo,
  CYBER_RISK_INSTRUCTION,
  DEFAULT_AGENT_PROMPT,
  getActionsSection,
  getAgentToolPathRulesSection,
  getLanguageSection,
  getOutputEfficiencySection,
  getSessionSpecificGuidanceSection,
  getSimpleToneAndStyleSection,
  getUsingYourToolsSection,
  getSimpleDoingTasksSection,
  getSimpleIntroSection,
  getSimpleSystemSection,
  loadProjectMemoryPrompt,
  SUMMARIZE_TOOL_RESULTS_SECTION,
  SYSTEM_PROMPT_DYNAMIC_BOUNDARY,
  type BuildAgentSystemPromptOptions,
  type BuildDefaultSubAgentSystemPromptOptions,
  type SessionSpecificGuidanceOptions,
} from './agent-system-prompt'

export { buildCoreAgentTools, buildAgentTools } from './agent-tool-prompts'
export { buildFullAgentTools, buildSubAgentToolList } from './agent-tool-registry'
export { buildExtendedAgentTools } from './agent-tool-prompts-ext'

/** 主 Agent 内置 + Extensions工具 */
export const AGENT_TOOLS: AgentToolDef[] = buildFullAgentTools()

/** 默认子代理工具（generalPurpose；Run时按 subagent_type 再过滤） */
export const SUB_AGENT_TOOLS: AgentToolDef[] = buildSubAgentToolList('generalPurpose')
