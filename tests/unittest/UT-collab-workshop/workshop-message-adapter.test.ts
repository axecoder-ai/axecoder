import { describe, expect, it } from 'vitest'
import {
  visibleWorkbenchWorkshopMessages,
  workshopToWorkbench,
} from '../../../src/utils/workshop-message-adapter'

describe('workshop-message-adapter', () => {
  it('workshopToWorkbench 映射字段', () => {
    const m = workshopToWorkbench({
      id: '1',
      roleId: 'backend',
      text: 'hello',
      createdAt: 1,
      speakerUserId: 'u1',
    })
    expect(m.kind).toBe('workshop')
    expect(m.speakerUserId).toBe('u1')
  })

  it('visibleWorkbenchWorkshopMessages 跳过 hidden', () => {
    const list = visibleWorkbenchWorkshopMessages([
      { id: 'a', roleId: 'user', text: 'x', createdAt: 1, hidden: true },
      { id: 'b', roleId: 'manager', text: 'y', createdAt: 2 },
    ])
    expect(list).toHaveLength(1)
    expect(list[0].id).toBe('b')
  })
})
