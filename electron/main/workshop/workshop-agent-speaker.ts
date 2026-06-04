import { runWorkshopRoleAgentTurn } from '../agent/agent-loop'
import { modelTaskKindForWorkshopRole, resolveModelIdForTask } from '../ai/model-resolve'
import { buildWorkshopStreamId } from './workshop-stream'
import {
  formatManagerCodeBrief,
  formatMemberChatSummary,
  formatWorkshopRoleDisplay,
} from './workshop-display'
import { buildRoleTaskPrompt, parseSubagentReport } from './workshop-subagent-speaker'
import { enrichRoleSpeakInputWithSkills } from './workshop-user-skills'
import type { RoleSpeaker } from './workshop-types'

export const buildAgentRoleSpeaker = (
  projectRoot: string,
  modelId: string,
  workshopId: string,
  getUserImages: () => import('../models-types').AiChatImagePart[] | undefined,
): RoleSpeaker => {
  return async (input) => {
    const root = projectRoot.trim()
    if (!root) throw new Error('Open a project first')
    const enriched = await enrichRoleSpeakInputWithSkills(input, root)
    const name = enriched.assigneeUser?.displayName?.trim() || enriched.roleId
    const taskPrompt = buildRoleTaskPrompt(enriched)
    const streamKey =
      (enriched.speakMode === 'member' ||
        enriched.speakMode === 'execute' ||
        enriched.speakMode === 'manager_chat') &&
      enriched.assigneeUser
        ? `u-${enriched.assigneeUser.id}`
        : enriched.roleId
    const sessionId = buildWorkshopStreamId(workshopId, streamKey)
    const roleModelId = await resolveModelIdForTask(
      modelTaskKindForWorkshopRole(enriched.roleId, enriched.speakMode),
    )
    const userImages = getUserImages()
    const res = await runWorkshopRoleAgentTurn(root, roleModelId, sessionId, taskPrompt, name, {
      speakMode: enriched.speakMode,
      userImages,
    })
    if (!res.ok) throw new Error(res.error)
    const users = enriched.users ?? []
    const clarify = parseSubagentReport(res.report, enriched.roleId, enriched.userBrief)
    const display =
      enriched.speakMode === 'manager_chat'
        ? formatManagerCodeBrief(res.report)
        : enriched.speakMode === 'member'
          ? formatMemberChatSummary(res.report, clarify.relatedFiles)
          : formatWorkshopRoleDisplay(res.report, enriched.speakMode, users)
    const reasoningContent =
      display.reasoningContent ??
      ('reasoningContent' in res ? res.reasoningContent : undefined)
    if ('needsUser' in res && res.needsUser) {
      return {
        summary: display.summary,
        planSource: display.planSource,
        needsUser: true,
        userQuestion: res.userQuestion,
        relatedFiles: clarify.relatedFiles,
        reasoningContent,
      }
    }
    return {
      summary: display.summary,
      planSource: display.planSource,
      relatedFiles: clarify.relatedFiles,
      needsUser: clarify.needsUser,
      userQuestion: clarify.userQuestion,
      reasoningContent,
    }
  }
}
