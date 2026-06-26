export type TerminalKind = 'shell' | 'claude' | 'codex' | 'cursor-agent'

export type TerminalCliListItem = {
  kind: Exclude<TerminalKind, 'shell'>
  available: boolean
}

export const AI_TERMINAL_KINDS: Exclude<TerminalKind, 'shell'>[] = [
  'claude',
  'codex',
  'cursor-agent',
]
