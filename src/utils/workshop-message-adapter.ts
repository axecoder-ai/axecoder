import type { WorkshopMessage } from '../types/axecoder'

export type WorkbenchMessageKind = 'workshop'

/** Unified workshop message view in facade */
export type WorkbenchWorkshopMessage = {
  id: string
  kind: WorkbenchMessageKind
  text: string
  createdAt: number
  roleId: WorkshopMessage['roleId']
  speakerUserId?: string
  relatedFiles?: string[]
  reasoningContent?: string
  hidden?: boolean
}

export const workshopToWorkbench = (m: WorkshopMessage): WorkbenchWorkshopMessage => ({
  id: m.id,
  kind: 'workshop',
  text: m.text,
  createdAt: m.createdAt,
  roleId: m.roleId,
  speakerUserId: m.speakerUserId,
  relatedFiles: m.relatedFiles,
  reasoningContent: m.reasoningContent,
  hidden: m.hidden,
})

export const visibleWorkbenchWorkshopMessages = (
  messages: WorkshopMessage[],
): WorkbenchWorkshopMessage[] =>
  messages.filter((m) => !m.hidden).map(workshopToWorkbench)
