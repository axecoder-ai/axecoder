import { execFileSync } from 'node:child_process'
import type { TerminalKind } from '../../shared/terminal-kinds'

export type DetectedTerminalCli = {
  kind: Exclude<TerminalKind, 'shell'>
  command: string
  args: string[]
}

const whichCmd = (name: string): string | null => {
  try {
    const bin = process.platform === 'win32' ? 'where' : 'which'
    const out = execFileSync(bin, [name], { encoding: 'utf8', timeout: 3000 }).trim()
    const line = out.split(/\r?\n/)[0]?.trim()
    return line || null
  } catch {
    return null
  }
}

const cursorAgentAvailable = (): boolean => {
  const cursor = whichCmd('cursor')
  if (!cursor) return false
  try {
    execFileSync(cursor, ['agent', '--version'], {
      encoding: 'utf8',
      timeout: 8000,
      stdio: 'pipe',
    })
    return true
  } catch {
    return false
  }
}

export const detectAiTerminalClis = (): DetectedTerminalCli[] => {
  const clis: DetectedTerminalCli[] = []

  const claude = whichCmd('claude')
  if (claude) clis.push({ kind: 'claude', command: claude, args: [] })

  const codex = whichCmd('codex')
  if (codex) clis.push({ kind: 'codex', command: codex, args: [] })

  if (cursorAgentAvailable()) {
    const cursor = whichCmd('cursor')
    if (cursor) clis.push({ kind: 'cursor-agent', command: cursor, args: ['agent'] })
  }

  return clis
}

const missingCliMessage = (kind: Exclude<TerminalKind, 'shell'>): string => {
  if (kind === 'claude') return 'Claude Code CLI (claude) not found in PATH'
  if (kind === 'codex') return 'Codex CLI (codex) not found in PATH'
  return 'Cursor Agent CLI (cursor agent) not found in PATH'
}

export const resolveTerminalSpawn = (
  kind: TerminalKind,
  detected?: DetectedTerminalCli[],
): { file: string; args: string[] } | { error: string } => {
  if (kind === 'shell') {
    const file =
      process.platform === 'win32' ? process.env.COMSPEC || 'cmd.exe' : process.env.SHELL || '/bin/zsh'
    const args = process.platform === 'win32' ? [] : ['-i', '-l']
    return { file, args }
  }

  const hit = (detected ?? detectAiTerminalClis()).find((c) => c.kind === kind)
  if (!hit) return { error: missingCliMessage(kind) }
  return { file: hit.command, args: hit.args }
}
