import { describe, it, expect } from 'vitest'
import {
  clampAgentsWidth,
  clampAiPanelWidth,
  clampSidebarWidth,
  groupSessionsByDay,
  isToday,
  minAiPanelWidth,
  sliceGroupItems,
  WC_AGENTS_MIN,
  WC_CHAT_MIN,
  WC_EDITOR_MIN,
  WC_SIDEBAR_DEFAULT,
  WC_SIDEBAR_MIN,
} from '../../../src/utils/agents-panel'
import type { SessionListItem } from '../../../src/types/axecoder'

const meta = (id: string, updatedAt: number): SessionListItem => ({
  id,
  title: id,
  updatedAt,
  kind: 'agent',
})

describe('minAiPanelWidth', () => {
  it('Agents 可见时含 Chat 与 Agents 宽', () => {
    expect(minAiPanelWidth(true, 280)).toBe(WC_CHAT_MIN + 280)
    expect(minAiPanelWidth(false, 280)).toBe(WC_CHAT_MIN)
  })
})

describe('clampAiPanelWidth', () => {
  it('限制编辑器与 AI 面板宽度', () => {
    const min = minAiPanelWidth(true, 280)
    expect(clampAiPanelWidth(100, 1200, true, 280)).toBe(min)
    expect(clampAiPanelWidth(2000, 1200, true, 280)).toBe(1200 - WC_EDITOR_MIN)
    expect(clampAiPanelWidth(600, 1200, true, 280)).toBe(600)
  })
})

describe('clampSidebarWidth', () => {
  it('限制左侧边栏宽度', () => {
    expect(clampSidebarWidth(100, 1200, 600)).toBe(WC_SIDEBAR_MIN)
    expect(clampSidebarWidth(900, 1200, 600)).toBe(560)
    expect(clampSidebarWidth(280, 1200, 600)).toBe(280)
  })

  it('容器过窄时返回默认宽', () => {
    expect(clampSidebarWidth(WC_SIDEBAR_DEFAULT, 0, 600)).toBe(WC_SIDEBAR_DEFAULT)
  })
})

describe('clampAgentsWidth', () => {
  it('限制在最小与最大之间', () => {
    expect(clampAgentsWidth(100, 800)).toBe(WC_AGENTS_MIN)
    expect(clampAgentsWidth(900, 800)).toBe(800 - WC_CHAT_MIN)
    expect(clampAgentsWidth(280, 800)).toBe(280)
  })

  it('容器过窄时返回最小宽', () => {
    expect(clampAgentsWidth(280, 400)).toBe(WC_AGENTS_MIN)
  })
})

describe('isToday', () => {
  const now = new Date(2026, 4, 28, 15, 0, 0).getTime()

  it('同一天返回 true', () => {
    const ts = new Date(2026, 4, 28, 8, 0, 0).getTime()
    expect(isToday(ts, now)).toBe(true)
  })

  it('昨天返回 false', () => {
    const ts = new Date(2026, 4, 27, 23, 0, 0).getTime()
    expect(isToday(ts, now)).toBe(false)
  })
})

describe('groupSessionsByDay', () => {
  const now = new Date(2026, 4, 28, 12, 0, 0).getTime()

  it('groups into Today, Yesterday, Last 7 Days and Earlier', () => {
    const sessions = [
      meta('a', new Date(2026, 4, 28, 10, 0, 0).getTime()),
      meta('b', new Date(2026, 4, 27, 10, 0, 0).getTime()),
      meta('c', new Date(2026, 4, 25, 10, 0, 0).getTime()),
      meta('d', new Date(2026, 4, 10, 10, 0, 0).getTime()),
    ]
    const groups = groupSessionsByDay(sessions, now)
    expect(groups).toHaveLength(4)
    expect(groups[0].label).toBe('Today')
    expect(groups[0].items.map((s) => s.id)).toEqual(['a'])
    expect(groups[1].label).toBe('Yesterday')
    expect(groups[1].items.map((s) => s.id)).toEqual(['b'])
    expect(groups[2].label).toBe('Last 7 Days')
    expect(groups[2].items.map((s) => s.id)).toEqual(['c'])
    expect(groups[3].label).toBe('Earlier')
    expect(groups[3].items.map((s) => s.id)).toEqual(['d'])
  })

  it('空列表返回空分组', () => {
    expect(groupSessionsByDay([], now)).toEqual([])
  })
})

describe('sliceGroupItems', () => {
  const items = Array.from({ length: 10 }, (_, i) => meta(`s${i}`, i))

  it('未展开时截断', () => {
    const { visible, hasMore } = sliceGroupItems(items, false, 8)
    expect(visible).toHaveLength(8)
    expect(hasMore).toBe(true)
  })

  it('展开后显示全部', () => {
    const { visible, hasMore } = sliceGroupItems(items, true, 8)
    expect(visible).toHaveLength(10)
    expect(hasMore).toBe(false)
  })
})
