import type { AgentToolDef } from './agent-types'
import { buildAgentTools } from './agent-tool-prompts'

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

export { buildAgentTools } from './agent-tool-prompts'

/** 主 Agent 内置工具（§14 长 description 见 agent-tool-prompts.ts） */
export const AGENT_TOOLS: AgentToolDef[] = buildAgentTools()

/** 子代理可用工具（不可递归委派、不可阻塞问用户） */
export const SUB_AGENT_TOOLS: AgentToolDef[] = []

for (const t of AGENT_TOOLS) {
  if (t.name !== 'Agent' && t.name !== 'AskUserQuestion') {
    SUB_AGENT_TOOLS.push(t)
  }
}
