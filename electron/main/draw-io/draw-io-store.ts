import type { WorkshopSession } from '../workshop/workshop-types'
import { DEFAULT_DRAW_IO_XML } from './draw-io-defaults'
import { emitDrawIoDiagramUpdated } from './draw-io-emit'

export const getWorkshopDiagramXml = (session: WorkshopSession): string =>
  session.diagramXml?.trim() || DEFAULT_DRAW_IO_XML

export const setWorkshopDiagramXml = (session: WorkshopSession, xml: string) => {
  session.diagramXml = xml
  emitDrawIoDiagramUpdated(session.id, xml)
}
