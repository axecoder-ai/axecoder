import type { AgentToolDef, AgentToolName } from './agent-types'
import { buildCoreAgentTools } from './agent-tool-prompts'
import { buildExtendedAgentTools } from './agent-tool-prompts-ext'
import { filterToolsForCcSubagent } from './agent-subagent-types'

export const buildFullAgentTools = (): AgentToolDef[] => [
  ...buildCoreAgentTools(),
  ...buildExtendedAgentTools(),
]

export const buildSubAgentToolList = (
  subagentType?: string,
  readonlyFlag?: boolean,
): AgentToolDef[] =>
  filterToolsForCcSubagent(buildFullAgentTools(), subagentType || 'generalPurpose', readonlyFlag) as AgentToolDef[]

export const SUB_AGENT_DISALLOWED: AgentToolName[] = ['Task', 'Coordinator', 'Agent', 'AskUserQuestion']
