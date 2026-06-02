import { runWorkshopRoleAgentTurn } from '../agent/agent-loop'
import { modelTaskKindForWorkshopRole, resolveModelIdForTask } from '../ai/model-resolve'
import { roleDefById } from './workshop-roles'
import { buildWorkshopStreamId } from './workshop-stream'
import { formatWorkshopRoleDisplay } from './workshop-display'
import { buildRoleTaskPrompt, parseSubagentReport } from './workshop-subagent-speaker'
import type { RoleSpeaker } from './workshop-types'

export const buildAgentRoleSpeaker = (projectRoot: string, modelId: string, workshopId: string): RoleSpeaker => {
  return async (input) => {
    const root = projectRoot.trim()
    if (!root) throw new Error('请先打开项目')
    const role = roleDefById(input.roleId)
    const name = input.assigneeUser?.displayName ?? role?.name ?? input.roleId
    const taskPrompt = buildRoleTaskPrompt(input)
    const streamKey =
      input.speakMode === 'execute' && input.assigneeUser
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
    const display = formatWorkshopRoleDisplay(res.report, input.speakMode, users)
    const clarify = parseSubagentReport(res.report, input.roleId, input.userBrief)
    const reasoningContent =
      input.speakMode === 'plan' || input.speakMode === 'verify'
        ? undefined
        : (display.reasoningContent ?? res.reasoningContent?.trim()) || undefined
    if ('needsUser' in res && res.needsUser) {
      return {
        summary: display.summary,
        planSource: display.planSource,
        reasoningContent,
        needsUser: true,
        userQuestion: res.userQuestion,
        relatedFiles: clarify.relatedFiles,
      }
    }
    return {
      summary: display.summary,
      planSource: display.planSource,
      reasoningContent,
      relatedFiles: clarify.relatedFiles,
      needsUser: clarify.needsUser,
      userQuestion: clarify.userQuestion,
    }
  }
}
