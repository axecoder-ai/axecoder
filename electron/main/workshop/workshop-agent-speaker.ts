import { runWorkshopRoleAgentTurn } from '../agent/agent-loop'
import { modelTaskKindForWorkshopRole, resolveModelIdForTask } from '../ai/model-resolve'
import { buildWorkshopStreamId } from './workshop-stream'
import { formatMemberChatSummary, formatWorkshopRoleDisplay } from './workshop-display'
import { buildRoleTaskPrompt, parseSubagentReport } from './workshop-subagent-speaker'
import type { RoleSpeaker } from './workshop-types'

export const buildAgentRoleSpeaker = (projectRoot: string, modelId: string, workshopId: string): RoleSpeaker => {
  return async (input) => {
    const root = projectRoot.trim()
    if (!root) throw new Error('请先打开项目')
    const name = input.assigneeUser?.displayName?.trim() || input.roleId
    const taskPrompt = buildRoleTaskPrompt(input)
    const streamKey =
      (input.speakMode === 'member' || input.speakMode === 'execute') && input.assigneeUser
        ? `u-${input.assigneeUser.id}`
        : input.roleId
    const sessionId = buildWorkshopStreamId(workshopId, streamKey)
    const roleModelId = await resolveModelIdForTask(
      modelTaskKindForWorkshopRole(input.roleId, input.speakMode),
    )
    const res = await runWorkshopRoleAgentTurn(root, roleModelId, sessionId, taskPrompt, name, {
      speakMode: input.speakMode,
    })
    if (!res.ok) throw new Error(res.error)
    const users = input.users ?? []
    const clarify = parseSubagentReport(res.report, input.roleId, input.userBrief)
    const display =
      input.speakMode === 'member'
        ? formatMemberChatSummary(res.report, clarify.relatedFiles)
        : formatWorkshopRoleDisplay(res.report, input.speakMode, users)
    if ('needsUser' in res && res.needsUser) {
      return {
        summary: display.summary,
        planSource: display.planSource,
        needsUser: true,
        userQuestion: res.userQuestion,
        relatedFiles: clarify.relatedFiles,
      }
    }
    return {
      summary: display.summary,
      planSource: display.planSource,
      relatedFiles: clarify.relatedFiles,
      needsUser: clarify.needsUser,
      userQuestion: clarify.userQuestion,
    }
  }
}
