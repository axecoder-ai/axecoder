import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, it, expect } from 'vitest'
import {
  includesRightPanelLayoutIcon,
  LEGACY_AGENTS_PANEL_ICON_MARKERS,
} from '../../../src/utils/right-panel-layout-icon'

const ROOT = join(fileURLToPath(new URL('.', import.meta.url)), '../../..')

const readComponent = (name: string) =>
  readFileSync(join(ROOT, 'src/components/workbench', name), 'utf8')

const sliceBetween = (content: string, start: string, end: string) => {
  const i = content.indexOf(start)
  expect(i).toBeGreaterThanOrEqual(0)
  const j = content.indexOf(end, i + start.length)
  expect(j).toBeGreaterThan(i)
  return content.slice(i, j)
}

describe('Agents 历史侧栏折叠图标', () => {
  it('TitleBar toggleAiPanel 使用聊天气泡图标', () => {
    const tb = readComponent('TitleBar.vue')
    const block = sliceBetween(tb, '@click="$emit(\'toggleAiPanel\')"', '</button>')
    expect(block.includes('chat-toggle-icon') || block.includes('codicon-comment-discussion')).toBe(
      true,
    )
    expect(includesRightPanelLayoutIcon(block)).toBe(false)
  })

  it('AgentsPanel panel-toggle 使用右侧侧栏布局图标', () => {
    const ap = readComponent('AgentsPanel.vue')
    const block = sliceBetween(ap, 'class="panel-toggle"', '</button>')
    expect(
      includesRightPanelLayoutIcon(block) || block.includes('codicon-layout-sidebar-right'),
    ).toBe(true)
    expect(block.includes(LEGACY_AGENTS_PANEL_ICON_MARKERS.inner)).toBe(false)
  })

  it('ChatPane agents-expand 使用右侧侧栏布局图标', () => {
    const cp = readComponent('ChatPane.vue')
    const block = sliceBetween(cp, 'class="agents-expand"', '</button>')
    expect(
      includesRightPanelLayoutIcon(block) || block.includes('codicon-layout-sidebar-right'),
    ).toBe(true)
    expect(block.includes(LEGACY_AGENTS_PANEL_ICON_MARKERS.inner)).toBe(false)
  })

  it('ChatPane 标签栏提供关闭 AI 面板按钮', () => {
    const cp = readComponent('ChatPane.vue')
    expect(cp.includes('class="chat-pane-close"')).toBe(true)
    expect(cp.includes("@click=\"emit('close')\"")).toBe(true)
  })

  it('ChatPane 输入区 footer 未误用侧栏布局图标', () => {
    const cp = readComponent('ChatPane.vue')
    const footer = sliceBetween(cp, 'class="chat-input-footer"', 'class="send-btn"')
    expect(includesRightPanelLayoutIcon(footer)).toBe(false)
  })
})
