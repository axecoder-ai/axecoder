import type { AgentToolCall, AgentToolName, PendingSmartApprovalPublic } from './agent-types'
import { classifySmartReview } from './agent-smart-review-classifier'
import {
  createSmartPendingId,
  formatSmartReviewDetail,
  summarizeSmartReviewTool,
} from './agent-smart-review-params'

export type PendingSmartApprovalInternal = PendingSmartApprovalPublic & {
  toolCallId: string
  toolCall: AgentToolCall
  apply: () => Promise<import('./tool-executor').ToolRunResult>
}

export {
  SMART_MODE_APPROVAL_PROPERTIES,
  SMART_REVIEW_TOOL_NAMES,
  formatSmartReviewBlockMessage,
  formatSmartReviewDetail,
  getSmartModeBlockReason,
  isRequestSmartModeApproval,
  isSmartModeApprovalEnabled,
  shouldSmartReviewTool,
  summarizeSmartReviewTool,
} from './agent-smart-review-params'

export const runSmartReview = async (
  toolName: AgentToolName,
  args: Record<string, unknown>,
  opts: { chatModelId: string; classifierModelId?: string },
) => {
  try {
    return await classifySmartReview(toolName, args, opts)
  } catch {
    return { action: 'allow' as const, reason: '' }
  }
}

export { createSmartPendingId }
