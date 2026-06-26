import { describe, expect, it } from 'vitest'
import {
  applyTerminalFocusShortcuts,
  ctrlLetterControlChar,
  terminalCustomKeyHandlerAllowsXterm,
  tryPassthroughCtrlLetter,
} from '../../../shared/terminal-readline-keys'

const key = (partial: Partial<KeyboardEvent> & { key: string }) =>
  ({
    type: 'keydown',
    ctrlKey: false,
    metaKey: false,
    shiftKey: false,
    altKey: false,
    ...partial,
  }) as KeyboardEvent

describe('ctrlLetterControlChar', () => {
  it('Ctrl+R → \\x12', () => {
    expect(ctrlLetterControlChar('r')).toBe('\x12')
    expect(ctrlLetterControlChar('R')).toBe('\x12')
  })

  it('Ctrl+A → \\x01', () => {
    expect(ctrlLetterControlChar('a')).toBe('\x01')
  })

  it('非字母返回 null', () => {
    expect(ctrlLetterControlChar('1')).toBeNull()
  })
})

describe('tryPassthroughCtrlLetter', () => {
  it('写入控制字符', () => {
    let written = ''
    const ok = tryPassthroughCtrlLetter(key({ ctrlKey: true, key: 'r' }), (d) => { written = d })
    expect(ok).toBe(true)
    expect(written).toBe('\x12')
  })

  it('无 Ctrl 不处理', () => {
    let written = ''
    expect(tryPassthroughCtrlLetter(key({ key: 'r' }), (d) => { written = d })).toBe(false)
    expect(written).toBe('')
  })
})

describe('terminalCustomKeyHandlerAllowsXterm', () => {
  it('Ctrl+R 由 xterm 处理', () => {
    expect(terminalCustomKeyHandlerAllowsXterm(key({ ctrlKey: true, key: 'r' }))).toBe(true)
  })

  it('Ctrl+A/E/S 由 xterm 处理', () => {
    expect(terminalCustomKeyHandlerAllowsXterm(key({ ctrlKey: true, key: 'a' }))).toBe(true)
    expect(terminalCustomKeyHandlerAllowsXterm(key({ ctrlKey: true, key: 'e' }))).toBe(true)
    expect(terminalCustomKeyHandlerAllowsXterm(key({ ctrlKey: true, key: 's' }))).toBe(true)
  })

  it('macOS Cmd+R 由 xterm 处理以阻止刷新', () => {
    expect(terminalCustomKeyHandlerAllowsXterm(key({ metaKey: true, key: 'r' }))).toBe(true)
  })

  it('keyup 默认允许', () => {
    expect(
      terminalCustomKeyHandlerAllowsXterm({ ...key({ ctrlKey: true, key: 'r' }), type: 'keyup' }),
    ).toBe(true)
  })
})

describe('applyTerminalFocusShortcuts', () => {
  it('聚焦时禁用菜单快捷键', () => {
    let ignored: boolean | undefined
    applyTerminalFocusShortcuts(
      { setIgnoreMenuShortcuts: (v) => { ignored = v } },
      true,
    )
    expect(ignored).toBe(true)
  })

  it('失焦时恢复菜单快捷键', () => {
    let ignored: boolean | undefined
    applyTerminalFocusShortcuts(
      { setIgnoreMenuShortcuts: (v) => { ignored = v } },
      false,
    )
    expect(ignored).toBe(false)
  })

  it('无 webContents 时安全跳过', () => {
    expect(() => applyTerminalFocusShortcuts(null, true)).not.toThrow()
  })
})
