import type { AgentToolDef, AgentToolName, SubagentType } from './agent-types'
import { buildCoreAgentTools } from './agent-tool-prompts'
import { buildExtendedAgentTools } from './agent-tool-prompts-ext'
import { filterToolsForSubagent } from './agent-ext-executor'

export const buildFullAgentTools = (): AgentToolDef[] => [
  ...buildCoreAgentTools(),
  ...buildExtendedAgentTools(),
]

export const buildSubAgentToolList = (subagentType?: SubagentType | string): AgentToolDef[] =>
  filterToolsForSubagent(buildFullAgentTools(), subagentType) as AgentToolDef[]

export const SUB_AGENT_DISALLOWED: AgentToolName[] = ['Agent', 'AskUserQuestion']
