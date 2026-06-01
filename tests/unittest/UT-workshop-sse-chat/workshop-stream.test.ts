import { describe, expect, it } from 'vitest'
import {
  buildWorkshopStreamId,
  isWorkshopStreamId,
  parseWorkshopStreamId,
} from '../../../electron/main/workshop/workshop-stream'
import { parseWorkshopStreamRole, workshopStreamPrefix } from '../../../src/utils/workshop-stream'

describe('workshop-stream', () => {
  it('buildWorkshopStreamId 与 parse 往返', () => {
    const id = buildWorkshopStreamId('ws-abc', 'manager')
    expect(id).toBe('workshop-ws-abc-manager')
    expect(isWorkshopStreamId(id)).toBe(true)
    expect(parseWorkshopStreamId(id)).toEqual({ workshopId: 'ws-abc', roleId: 'manager' })
  })

  it('渲染端 parseWorkshopStreamRole 按 workshop 过滤', () => {
    const wid = 'ws-1'
    const streamId = buildWorkshopStreamId(wid, 'backend')
    expect(workshopStreamPrefix(wid)).toBe('workshop-ws-1-')
    expect(parseWorkshopStreamRole(streamId, wid)).toBe('backend')
    expect(parseWorkshopStreamRole(streamId, 'other')).toBeNull()
    expect(parseWorkshopStreamRole('chat-xyz', wid)).toBeNull()
  })
})
