import type { AgentToolCall } from './agent-types'
import { isReadOnlyBashCommand } from './agent-bash-readonly'

export type LoopGuardState = {
  stormSig: string
  stormCount: number
  repeatSuccessCounts: Record<string, number>
  toolRounds: number
}

export type LoopGuardConfig = {
  enabled: boolean
  stormThreshold: number
  repeatSuccessThreshold: number
  maxToolRounds: number
}

export const createLoopGuardState = (): LoopGuardState => ({
  stormSig: '',
  stormCount: 0,
  repeatSuccessCounts: {},
  toolRounds: 0,
})

export const resetLoopGuardForUserTurn = (state: LoopGuardState) => {
  state.stormSig = ''
  state.stormCount = 0
  state.repeatSuccessCounts = {}
  state.toolRounds = 0
}

const normalizeShellCommand = (command: string): string => command.trim().split(/\s+/).join(' ')

const hasShellWriteRedirect = (command: string): boolean => {
  let quote: "'" | '"' | null = null
  let prev = ''
  for (const ch of command) {
    if (quote) {
      if (ch === quote) quote = null
      prev = ch
      continue
    }
    if (ch === "'" || ch === '"') {
      quote = ch
      prev = ch
      continue
    }
    if ((ch === '>' || ch === '»') && prev !== '2' && prev !== '1') return true
    prev = ch
  }
  return false
}

const shellPythonOpenWrites = (lower: string): boolean => {
  if (!lower.includes('open(')) return false
  if (lower.includes('.write(')) return true
  for (const marker of [
    ", 'w",
    ', "w',
    ", 'a",
    ', "a',
    ", 'x",
    ', "x',
    "mode='w",
    'mode="w',
    "mode='a",
    'mode="a',
    "mode='x",
    'mode="x',
  ]) {
    if (lower.includes(marker)) return true
  }
  return false
}

export const isShellFileWriteCommand = (command: string): boolean => {
  const lower = command.toLowerCase()
  if (shellPythonOpenWrites(lower)) return true
  if (
    lower.includes('set-content') ||
    lower.includes('add-content') ||
    lower.includes('out-file')
  ) {
    return true
  }
  if (lower.includes('sed -i') || lower.includes('perl -pi')) return true
  return hasShellWriteRedirect(command)
}

const canonicalToolArgs = (args: Record<string, unknown>): string => JSON.stringify(args)

const strArg = (args: Record<string, unknown>, key: string): string => {
  const v = args[key]
  return typeof v === 'string' ? v : ''
}

export const repeatSuccessSignature = (
  toolName: string,
  args: Record<string, unknown>,
): string | null => {
  if (toolName === 'Write' || toolName === 'Edit' || toolName === 'Delete' || toolName === 'Move') {
    return `${toolName}\x00${canonicalToolArgs(args)}`
  }
  if (toolName === 'Bash') {
    const command = strArg(args, 'command')
    if (!command || isReadOnlyBashCommand(command)) return null
    if (args.run_in_background === true) return null
    if (!isShellFileWriteCommand(command)) return null
    return `Bash\x00${normalizeShellCommand(command)}`
  }
  return null
}

const WRITE_TOOL_NAMES = new Set(['Write', 'Edit', 'Delete', 'Move', 'Bash'])

export const isWriteLikeToolName = (toolName: string): boolean => WRITE_TOOL_NAMES.has(toolName)

export const isBlockedToolContent = (content: string, ok: boolean): boolean => {
  if (ok) return false
  const lower = content.toLowerCase()
  return (
    lower.includes('blocked by agent permission') ||
    lower.includes('hook blocked') ||
    lower.includes('plan mode') ||
    lower.startsWith('blocked:') ||
    lower.includes('pending user approval')
  )
}

export const toolErrorForStorm = (content: string, ok: boolean, blocked: boolean): string => {
  if (ok || blocked) return ''
  const line = content.split('\n')[0]?.trim() ?? content.trim()
  return line || 'error'
}

export type GuardToolOutcome = {
  toolName: string
  args: Record<string, unknown>
  content: string
  ok: boolean
}

export const checkRepeatBeforeExecute = (
  state: LoopGuardState,
  config: LoopGuardConfig,
  toolName: string,
  args: Record<string, unknown>,
): string | null => {
  if (!config.enabled) return null
  const sig = repeatSuccessSignature(toolName, args)
  if (!sig) return null
  const count = state.repeatSuccessCounts[sig] ?? 0
  if (count < config.repeatSuccessThreshold) return null
  return `blocked: [loop guard] "${toolName}" has already succeeded ${count} times with the same write-like arguments in this user turn. Re-running it is unlikely to help and may burn tokens or repeat file writes. Change approach: use Edit for file changes, verify with a read/test command, or explain the blocker in your final answer.`
}

export const recordRepeatSuccess = (
  state: LoopGuardState,
  toolName: string,
  args: Record<string, unknown>,
  ok: boolean,
) => {
  if (!ok) return
  const sig = repeatSuccessSignature(toolName, args)
  if (!sig) return
  state.repeatSuccessCounts[sig] = (state.repeatSuccessCounts[sig] ?? 0) + 1
}

const batchStormSignature = (
  calls: AgentToolCall[],
  outcomes: GuardToolOutcome[],
): string | null => {
  if (calls.length !== outcomes.length || calls.length === 0) return null
  let sig = ''
  for (let i = 0; i < calls.length; i++) {
    const o = outcomes[i]!
    const blocked = isBlockedToolContent(o.content, o.ok)
    const err = toolErrorForStorm(o.content, o.ok, blocked)
    if (!err) return null
    sig += `${calls[i]!.name}\x00${err}\x00`
  }
  return sig
}

export const applyStormBreaker = (
  state: LoopGuardState,
  config: LoopGuardConfig,
  calls: AgentToolCall[],
  outcomes: GuardToolOutcome[],
): { contents: string[]; notice: string | null } => {
  const contents = outcomes.map((o) => o.content)
  if (!config.enabled) return { contents, notice: null }

  const sig = batchStormSignature(calls, outcomes)
  if (!sig) {
    state.stormSig = ''
    state.stormCount = 0
    return { contents, notice: null }
  }
  if (sig !== state.stormSig) {
    state.stormSig = sig
    state.stormCount = 1
    return { contents, notice: null }
  }
  state.stormCount += 1
  if (state.stormCount < config.stormThreshold) return { contents, notice: null }

  const subject =
    calls.length > 1
      ? `this batch of ${calls.length} tool calls`
      : `"${calls[0]!.name}"`
  const short = calls.length > 1 ? `a batch of ${calls.length} calls` : calls[0]!.name
  const guardText =
    `\n\n[loop guard] ${subject} has now failed ${state.stormCount} times in a row with the same error. Re-sending it — even with the wording changed — will not help: the calls keep failing the same way. Change approach: if an argument is being truncated, write less in one call and split the work; otherwise fix the arguments, use a different tool, or explain the blocker in your final answer.`
  contents[0] = `${contents[0] ?? ''}${guardText}`
  return {
    contents,
    notice: `loop guard: ${short} failed ${state.stormCount}× the same way — nudging the model to change approach`,
  }
}

export const exceededToolRoundLimit = (
  state: LoopGuardState,
  config: LoopGuardConfig,
): boolean => config.maxToolRounds > 0 && state.toolRounds > config.maxToolRounds

export const resolveLoopGuardConfig = (cfg: {
  agentLoopGuardEnabled?: boolean
  agentLoopGuardStormThreshold?: number
  agentLoopGuardRepeatSuccessThreshold?: number
  agentMaxToolRounds?: number
}): LoopGuardConfig => ({
  enabled: cfg.agentLoopGuardEnabled !== false,
  stormThreshold: Math.max(1, cfg.agentLoopGuardStormThreshold ?? 3),
  repeatSuccessThreshold: Math.max(1, cfg.agentLoopGuardRepeatSuccessThreshold ?? 2),
  maxToolRounds: Math.max(0, cfg.agentMaxToolRounds ?? 0),
})
