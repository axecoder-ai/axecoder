import fs from 'node:fs/promises'
import path from 'node:path'
import { pathToFileURL } from 'node:url'
import type {
  CallHierarchyIncomingCall,
  CallHierarchyItem,
  CallHierarchyOutgoingCall,
  DocumentSymbol,
  Hover,
  Location,
  LocationLink,
  SymbolInformation,
} from 'vscode-languageserver-types'
import {
  ensureLspForProject,
  getInitializationStatus,
  getLspServerManager,
  waitForInitialization,
} from '../lsp/lsp-manager'
import {
  formatDocumentSymbolResult,
  formatFindReferencesResult,
  formatGoToDefinitionResult,
  formatHoverResult,
  formatIncomingCallsResult,
  formatOutgoingCallsResult,
  formatPrepareCallHierarchyResult,
  formatWorkspaceSymbolResult,
} from '../lsp/lsp-formatters'
import { LSP_OPERATIONS, type LspOperation } from '../lsp/types'
import { filterGitIgnoredLocations } from './agent-lsp-gitignore'
import { resolvePathInProject } from './agent-path'

const MAX_LSP_FILE_SIZE_BYTES = 10_000_000

export type LspToolInput = {
  operation: LspOperation
  filePath: string
  line: number
  character: number
}

const str = (v: unknown) => (typeof v === 'string' ? v : '')

const num = (v: unknown) => (typeof v === 'number' && Number.isFinite(v) ? v : NaN)

export const parseLspToolInput = (
  args: Record<string, unknown>,
): { ok: true; input: LspToolInput } | { ok: false; error: string } => {
  const op = str(args.operation || args.Operation)
  if (!LSP_OPERATIONS.includes(op as LspOperation)) {
    return { ok: false, error: `Invalid operation: ${op}` }
  }
  const filePath = str(args.filePath || args.file_path)
  const line = num(args.line)
  const character = num(args.character)
  if (!filePath) return { ok: false, error: 'filePath is required' }
  if (!Number.isInteger(line) || line < 1) return { ok: false, error: 'line must be a positive integer (1-based)' }
  if (!Number.isInteger(character) || character < 1) {
    return { ok: false, error: 'character must be a positive integer (1-based)' }
  }
  return { ok: true, input: { operation: op as LspOperation, filePath, line, character } }
}

const getMethodAndParams = (input: LspToolInput, absolutePath: string) => {
  const uri = pathToFileURL(absolutePath).href
  const position = { line: input.line - 1, character: input.character - 1 }

  switch (input.operation) {
    case 'goToDefinition':
      return { method: 'textDocument/definition', params: { textDocument: { uri }, position } }
    case 'findReferences':
      return {
        method: 'textDocument/references',
        params: { textDocument: { uri }, position, context: { includeDeclaration: true } },
      }
    case 'hover':
      return { method: 'textDocument/hover', params: { textDocument: { uri }, position } }
    case 'documentSymbol':
      return { method: 'textDocument/documentSymbol', params: { textDocument: { uri } } }
    case 'workspaceSymbol':
      return { method: 'workspace/symbol', params: { query: '' } }
    case 'goToImplementation':
      return { method: 'textDocument/implementation', params: { textDocument: { uri }, position } }
    case 'prepareCallHierarchy':
    case 'incomingCalls':
    case 'outgoingCalls':
      return { method: 'textDocument/prepareCallHierarchy', params: { textDocument: { uri }, position } }
  }
}

const isLocationLink = (item: Location | LocationLink): item is LocationLink => 'targetUri' in item

const toLocation = (item: Location | LocationLink): Location =>
  isLocationLink(item)
    ? { uri: item.targetUri, range: item.targetSelectionRange || item.targetRange }
    : item

const countSymbols = (symbols: DocumentSymbol[]): number => {
  let count = symbols.length
  for (const s of symbols) {
    if (s.children?.length) count += countSymbols(s.children)
  }
  return count
}

const countUniqueFiles = (locations: Location[]) => new Set(locations.map((l) => l.uri)).size

const formatResult = (
  operation: LspOperation,
  result: unknown,
  cwd: string,
): { formatted: string; resultCount: number; fileCount: number } => {
  switch (operation) {
    case 'goToDefinition':
    case 'goToImplementation': {
      const raw = Array.isArray(result) ? result : result ? [result] : []
      const locations = (raw as (Location | LocationLink)[]).map(toLocation).filter((l) => l?.uri)
      return {
        formatted: formatGoToDefinitionResult(result as Location | Location[] | null, cwd),
        resultCount: locations.length,
        fileCount: countUniqueFiles(locations),
      }
    }
    case 'findReferences': {
      const locations = ((result as Location[]) || []).filter((l) => l?.uri)
      return {
        formatted: formatFindReferencesResult(result as Location[] | null, cwd),
        resultCount: locations.length,
        fileCount: countUniqueFiles(locations),
      }
    }
    case 'hover':
      return {
        formatted: formatHoverResult(result as Hover | null, cwd),
        resultCount: result ? 1 : 0,
        fileCount: result ? 1 : 0,
      }
    case 'documentSymbol': {
      const symbols = (result as (DocumentSymbol | SymbolInformation)[]) || []
      const isDoc = symbols.length > 0 && symbols[0] && 'range' in symbols[0]
      const count = isDoc ? countSymbols(symbols as DocumentSymbol[]) : symbols.length
      return {
        formatted: formatDocumentSymbolResult(
          result as DocumentSymbol[] | SymbolInformation[] | null,
          cwd,
        ),
        resultCount: count,
        fileCount: symbols.length > 0 ? 1 : 0,
      }
    }
    case 'workspaceSymbol': {
      const symbols = ((result as SymbolInformation[]) || []).filter((s) => s?.location?.uri)
      return {
        formatted: formatWorkspaceSymbolResult(result as SymbolInformation[] | null, cwd),
        resultCount: symbols.length,
        fileCount: countUniqueFiles(symbols.map((s) => s.location)),
      }
    }
    case 'prepareCallHierarchy': {
      const items = (result as CallHierarchyItem[]) || []
      return {
        formatted: formatPrepareCallHierarchyResult(result as CallHierarchyItem[] | null, cwd),
        resultCount: items.length,
        fileCount: items.length ? new Set(items.map((i) => i.uri).filter(Boolean)).size : 0,
      }
    }
    case 'incomingCalls': {
      const calls = (result as CallHierarchyIncomingCall[]) || []
      return {
        formatted: formatIncomingCallsResult(result as CallHierarchyIncomingCall[] | null, cwd),
        resultCount: calls.length,
        fileCount: calls.length ? new Set(calls.map((c) => c.from?.uri).filter(Boolean)).size : 0,
      }
    }
    case 'outgoingCalls': {
      const calls = (result as CallHierarchyOutgoingCall[]) || []
      return {
        formatted: formatOutgoingCallsResult(result as CallHierarchyOutgoingCall[] | null, cwd),
        resultCount: calls.length,
        fileCount: calls.length ? new Set(calls.map((c) => c.to?.uri).filter(Boolean)).size : 0,
      }
    }
  }
}

export const executeAgentLsp = async (
  projectRoot: string,
  args: Record<string, unknown>,
): Promise<{ ok: boolean; text: string }> => {
  const parsed = parseLspToolInput(args)
  if (!parsed.ok) return { ok: false, text: parsed.error }

  const { input } = parsed
  const absolutePath = resolvePathInProject(projectRoot, input.filePath)
  if (!absolutePath) {
    return { ok: false, text: `File path must be inside project: ${input.filePath}` }
  }

  try {
    await fs.stat(absolutePath)
  } catch {
    return { ok: false, text: `File does not exist: ${input.filePath}` }
  }

  await ensureLspForProject(projectRoot)
  if (getInitializationStatus() === 'pending') await waitForInitialization()

  const manager = getLspServerManager()
  if (!manager) {
    return {
      ok: false,
      text:
        'LSP server manager not initialized. Configure servers in ~/.axecoder/lsp.json or .axecoder/lsp.json (see resources/lsp.json.example).',
    }
  }

  const { method, params } = getMethodAndParams(input, absolutePath)
  const cwd = projectRoot

  if (!manager.isFileOpen(absolutePath)) {
    const st = await fs.stat(absolutePath)
    if (st.size > MAX_LSP_FILE_SIZE_BYTES) {
      return {
        ok: false,
        text: `File too large for LSP analysis (${Math.ceil(st.size / 1_000_000)}MB exceeds 10MB limit)`,
      }
    }
    const content = await fs.readFile(absolutePath, 'utf-8')
    await manager.openFile(absolutePath, content)
  }

  let result = await manager.sendRequest(absolutePath, method, params)
  if (result === undefined) {
    return {
      ok: true,
      text: `No LSP server available for file type: ${path.extname(absolutePath)}`,
    }
  }

  if (input.operation === 'incomingCalls' || input.operation === 'outgoingCalls') {
    const items = result as CallHierarchyItem[]
    if (!items?.length) {
      return { ok: true, text: 'No call hierarchy item found at this position' }
    }
    const callMethod =
      input.operation === 'incomingCalls' ? 'callHierarchy/incomingCalls' : 'callHierarchy/outgoingCalls'
    result = await manager.sendRequest(absolutePath, callMethod, { item: items[0] })
  }

  if (
    result &&
    Array.isArray(result) &&
    (input.operation === 'findReferences' ||
      input.operation === 'goToDefinition' ||
      input.operation === 'goToImplementation' ||
      input.operation === 'workspaceSymbol')
  ) {
    if (input.operation === 'workspaceSymbol') {
      const symbols = result as SymbolInformation[]
      const locations = symbols.filter((s) => s?.location?.uri).map((s) => s.location)
      const filtered = await filterGitIgnoredLocations(locations, cwd)
      const uris = new Set(filtered.map((l) => l.uri))
      result = symbols.filter((s) => !s?.location?.uri || uris.has(s.location.uri))
    } else {
      const locations = (result as (Location | LocationLink)[]).map(toLocation)
      const filtered = await filterGitIgnoredLocations(locations, cwd)
      const uris = new Set(filtered.map((l) => l.uri))
      result = (result as (Location | LocationLink)[]).filter((item) => {
        const loc = toLocation(item)
        return !loc.uri || uris.has(loc.uri)
      })
    }
  }

  const { formatted } = formatResult(input.operation, result, cwd)
  return { ok: true, text: formatted }
}
