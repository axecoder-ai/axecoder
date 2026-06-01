import { runWorkshopRoleAgentTurn } from '../agent/agent-loop'
import { roleDefById } from './workshop-roles'
import { buildWorkshopStreamId } from './workshop-stream'
import {
  buildRoleTaskPrompt,
  parseSubagentReport,
} from './workshop-subagent-speaker'
import type { RoleSpeaker } from './workshop-types'

export const buildAgentRoleSpeaker = (projectRoot: string, modelId: string, workshopId: string): RoleSpeaker => {
  return async (input) => {
    const root = projectRoot.trim()
    if (!root) throw new Error('请先打开项目')
    const role = roleDefById(input.roleId)
    const name = role?.name ?? input.roleId
    const taskPrompt = buildRoleTaskPrompt(input)
    const sessionId = buildWorkshopStreamId(workshopId, input.roleId)
    const res = await runWorkshopRoleAgentTurn(root, modelId, sessionId, taskPrompt, name)
    if (!res.ok) throw new Error(res.error)
    const out = parseSubagentReport(res.report, input.roleId, input.userBrief)
    if ('needsUser' in res && res.needsUser) {
      return {
        ...out,
        needsUser: true,
        userQuestion: res.userQuestion,
      }
    }
    return out
  }
}
