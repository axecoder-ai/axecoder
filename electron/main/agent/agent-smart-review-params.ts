import type { AgentToolName } from './agent-types'
import { isReadOnlyBashCommand } from './agent-bash-readonly'

export const SMART_REVIEW_TOOL_NAMES = new Set<AgentToolName>([
  'Bash',
  'WebFetch',
  'CallMcpTool',
  'WebRun',
  'Delete',
])

export const SMART_MODE_APPROVAL_PROPERTIES: Record<string, unknown> = {
  requestSmartModeApproval: {
    type: 'boolean',
    description:
      'Set true when retrying the exact same call after Auto-review blocked it, to show the user an approval card.',
  },
  smartModeBlockReason: {
    type: 'string',
    description:
      'Exact block reason returned by Auto-review; required when requestSmartModeApproval is true.',
  },
}

const strArg = (args: Record<string, unknown>, key: string) =>
  typeof args[key] === 'string' ? (args[key] as string) : ''

export const isSmartModeApprovalEnabled = (cfg: { agentSmartModeApproval?: boolean }) =>
  cfg.agentSmartModeApproval !== false

export const shouldSmartReviewTool = (
  toolName: AgentToolName,
  args: Record<string, unknown>,
): boolean => {
  if (!SMART_REVIEW_TOOL_NAMES.has(toolName)) return false
  if (toolName === 'Bash') {
    const cmd = strArg(args, 'command')
    if (cmd && isReadOnlyBashCommand(cmd)) return false
  }
  return true
}

export const isRequestSmartModeApproval = (args: Record<string, unknown>) =>
  args.requestSmartModeApproval === true

export const getSmartModeBlockReason = (args: Record<string, unknown>) =>
  strArg(args, 'smartModeBlockReason').trim()

export const formatSmartReviewBlockMessage = (reason: string) =>
  `Auto-review blocked this operation: ${reason}\n\nTo request user approval, retry the same tool call with requestSmartModeApproval: true and smartModeBlockReason set to the exact reason above.`

export const summarizeSmartReviewTool = (
  toolName: AgentToolName,
  args: Record<string, unknown>,
): string => {
  if (toolName === 'Bash') return strArg(args, 'command').slice(0, 120) || 'Bash'
  if (toolName === 'WebFetch') return strArg(args, 'url') || 'WebFetch'
  if (toolName === 'CallMcpTool') {
    return `${strArg(args, 'server')}/${strArg(args, 'toolName')}` || 'CallMcpTool'
  }
  if (toolName === 'Delete') return strArg(args, 'path') || 'Delete'
  if (toolName === 'WebRun') return strArg(args, 'action') || 'WebRun'
  return toolName
}

export const formatSmartReviewDetail = (
  toolName: AgentToolName,
  args: Record<string, unknown>,
): string => JSON.stringify({ tool: toolName, ...args }, null, 2)

let smartSeq = 0
export const createSmartPendingId = () => `smart-${Date.now()}-${smartSeq++}`
