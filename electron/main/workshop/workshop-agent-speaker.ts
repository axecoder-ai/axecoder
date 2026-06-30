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
import { resolveWorkshopReplyLanguage } from './workshop-language'
import type { RoleSpeaker, RoleSpeakInput } from './workshop-types'

/** Multi-Agent 成员/Tech Lead 回合：对齐 Software Co. 的 session 复用与工具全开 */
export const resolveWorkshopAgentParity = (input: RoleSpeakInput): boolean => {
  if (input.workshopAgentParity != null) return input.workshopAgentParity
  if (input.sopAgentParity || input.sopPhase) return false
  return (
    input.speakMode === 'member' ||
    input.speakMode === 'execute' ||
    input.speakMode === 'manager_chat'
  )
}

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
    const workshopParity = resolveWorkshopAgentParity(enriched)
    const enrichedWithParity = { ...enriched, workshopAgentParity: workshopParity }
    const name = enriched.assigneeUser?.displayName?.trim() || enriched.roleId
    const replyLanguage = await resolveWorkshopReplyLanguage(root)
    const taskPrompt = buildRoleTaskPrompt(enrichedWithParity, replyLanguage)
    const streamKey =
      enriched.sopAgentParity && enriched.assigneeUser
        ? `u-${enriched.assigneeUser.id}-sop`
        : enriched.reuseImplementSession && enriched.assigneeUser
          ? `u-${enriched.assigneeUser.id}-implement`
          : (enriched.speakMode === 'member' ||
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
      reuseSession: !!(
        enriched.reuseImplementSession ||
        enriched.sopAgentParity ||
        workshopParity
      ),
      sopBuiltinRole: enriched.assigneeUser?.builtinRole,
      sopAgentParity: enriched.sopAgentParity,
      workshopAgentParity: workshopParity,
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
        planSource: enriched.sopPhase ? res.report.trim() : display.planSource,
        needsUser: true,
        userQuestion: res.userQuestion,
        pendingAsks: res.pendingAsks,
        relatedFiles: clarify.relatedFiles,
        reasoningContent,
      }
    }
    return {
      summary: display.summary,
      planSource: enriched.sopPhase ? res.report.trim() : display.planSource,
      relatedFiles: clarify.relatedFiles,
      needsUser: clarify.needsUser,
      userQuestion: clarify.userQuestion,
      reasoningContent,
    }
  }
}
