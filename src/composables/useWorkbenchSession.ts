import type { Ref } from 'vue'
import type { SessionKind, WorkshopRunResult, WorkshopSession } from '../types/axecoder'

/** Unified Agent/Workshop send entry (Workshop part) */
export const useWorkbenchSession = (
  projectRoot: Ref<string>,
  kind: Ref<SessionKind>,
) => {
  const sendWorkshop = async (
    sessionId: string,
    text: string,
    modelId: string,
    displayText?: string,
    imageRefs?: import('../types/axecoder').ChatImageRef[],
    preferredAssigneeUserId?: string,
  ): Promise<WorkshopRunResult> => {
    if (kind.value !== 'workshop') {
      return { ok: false, error: 'Not a Workshop session' }
    }
    return window.axecoder.workshopSendMessage(
      projectRoot.value,
      sessionId,
      text,
      modelId,
      displayText,
      imageRefs,
      preferredAssigneeUserId,
    )
  }

  const loadWorkshop = async (sessionId: string): Promise<WorkshopSession | null> => {
    const res = await window.axecoder.getWorkshopSession(projectRoot.value, sessionId)
    return res.session
  }

  return { sendWorkshop, loadWorkshop }
}
