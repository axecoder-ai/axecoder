import type { Ref } from 'vue'
import type { SessionKind, WorkshopRunResult, WorkshopSession } from '../types/axecoder'

/** 统一 Agent / Workshop 会话发送入口（Workshop 部分） */
export const useWorkbenchSession = (
  projectRoot: Ref<string>,
  kind: Ref<SessionKind>,
) => {
  const sendWorkshop = async (
    sessionId: string,
    text: string,
    modelId: string,
    displayText?: string,
  ): Promise<WorkshopRunResult> => {
    if (kind.value !== 'workshop') {
      return { ok: false, error: '当前不是 Workshop 会话' }
    }
    return window.axecoder.workshopSendMessage(
      projectRoot.value,
      sessionId,
      text,
      modelId,
      displayText,
    )
  }

  const loadWorkshop = async (sessionId: string): Promise<WorkshopSession | null> => {
    const res = await window.axecoder.getWorkshopSession(projectRoot.value, sessionId)
    return res.session
  }

  return { sendWorkshop, loadWorkshop }
}
