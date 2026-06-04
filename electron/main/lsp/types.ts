export type LspServerState = 'stopped' | 'starting' | 'running' | 'stopping' | 'error'

export type ScopedLspServerConfig = {
  command: string
  args?: string[]
  env?: Record<string, string>
  workspaceFolder?: string
  extensionToLanguage: Record<string, string>
  initializationOptions?: Record<string, unknown>
  startupTimeout?: number
  maxRestarts?: number
}

export type LspConfigFile = {
  servers: Record<string, ScopedLspServerConfig>
}

export type LspOperation =
  | 'goToDefinition'
  | 'findReferences'
  | 'hover'
  | 'documentSymbol'
  | 'workspaceSymbol'
  | 'goToImplementation'
  | 'prepareCallHierarchy'
  | 'incomingCalls'
  | 'outgoingCalls'

export const LSP_OPERATIONS: LspOperation[] = [
  'goToDefinition',
  'findReferences',
  'hover',
  'documentSymbol',
  'workspaceSymbol',
  'goToImplementation',
  'prepareCallHierarchy',
  'incomingCalls',
  'outgoingCalls',
]
