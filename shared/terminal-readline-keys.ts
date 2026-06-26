/**
 * xterm attachCustomKeyEventHandler 返回值：
 * true = 继续由 xterm 处理；false = xterm 不处理。
 */
export type TerminalKeyEvent = Pick<
  KeyboardEvent,
  'type' | 'ctrlKey' | 'metaKey' | 'shiftKey' | 'altKey' | 'key'
>

/** Ctrl+字母 → 控制字符（Ctrl+R → \x12） */
export const ctrlLetterControlChar = (key: string): string | null => {
  if (key.length !== 1) return null
  const c = key.toLowerCase()
  if (c < 'a' || c > 'z') return null
  return String.fromCharCode(c.charCodeAt(0) - 96)
}

/** 将 Ctrl+字母 直接写入终端；已处理返回 true */
export const tryPassthroughCtrlLetter = (
  ev: TerminalKeyEvent,
  write: (data: string) => void,
): boolean => {
  if (ev.type !== 'keydown') return false
  if (!ev.ctrlKey || ev.shiftKey || ev.altKey || ev.metaKey) return false
  const ch = ctrlLetterControlChar(ev.key)
  if (!ch) return false
  write(ch)
  return true
}

export const terminalCustomKeyHandlerAllowsXterm = (ev: TerminalKeyEvent): boolean => {
  if (ev.type !== 'keydown') return true
  if (ev.altKey) return true
  if (ev.ctrlKey) return true
  if (ev.metaKey && ev.key.toLowerCase() === 'r') return true
  return true
}

export const applyTerminalFocusShortcuts = (
  webContents: { setIgnoreMenuShortcuts: (ignore: boolean) => void } | null | undefined,
  focused: boolean,
) => {
  webContents?.setIgnoreMenuShortcuts(!!focused)
}
