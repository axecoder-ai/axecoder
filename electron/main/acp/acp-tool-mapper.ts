import type { PermissionOption, ToolKind } from '@agentclientprotocol/sdk'

type PromptBlock = { type: string; text?: string }

export const agentToolToAcpKind = (name: string): ToolKind => {
  if (name === 'Read') return 'read'
  if (name === 'Write' || name === 'Edit' || name === 'ApplyPatch' || name === 'Delete' || name === 'Move')
    return 'edit'
  if (name === 'Bash' || name === 'ShellStdin') return 'execute'
  if (name === 'Grep' || name === 'Glob' || name === 'SemanticSearch' || name === 'ToolSearch') return 'search'
  if (name === 'WebFetch' || name === 'WebSearch' || name === 'WebRun') return 'fetch'
  return 'other'
}

export const extractPromptText = (blocks: PromptBlock[]): string =>
  blocks
    .filter((b) => b.type === 'text' && typeof b.text === 'string')
    .map((b) => b.text!.trim())
    .filter(Boolean)
    .join('\n')

export const buildPermissionOptions = (): PermissionOption[] => [
  { kind: 'allow_once', name: 'Allow once', optionId: 'allow_once' },
  { kind: 'reject_once', name: 'Reject', optionId: 'reject_once' },
]

export const mapToolStatus = (
  phase: 'start' | 'done',
  ok?: boolean,
): 'pending' | 'completed' | 'failed' =>
  phase === 'start' ? 'pending' : ok === false ? 'failed' : 'completed'

export const nextToolCallId = (() => {
  let n = 0
  return () => {
    n += 1
    return `axecoder-tool-${n}`
  }
})()
