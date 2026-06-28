import * as path from 'node:path'
import { pathToFileURL } from 'node:url'
import type { InitializeParams } from 'vscode-languageserver-protocol'
import { createLSPClient } from './lsp-client'
import type { LspServerState, ScopedLspServerConfig } from './types'

const LSP_ERROR_CONTENT_MODIFIED = -32801
const MAX_RETRIES = 3
const RETRY_BASE_MS = 500

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const withTimeout = <T>(promise: Promise<T>, ms: number, message: string): Promise<T> =>
  Promise.race([
    promise,
    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(message)), ms)),
  ])

export type LSPServerInstance = {
  readonly name: string
  readonly config: ScopedLspServerConfig
  readonly state: LspServerState
  start(): Promise<void>
  stop(): Promise<void>
  sendRequest<T>(method: string, params: unknown): Promise<T>
  sendNotification(method: string, params: unknown): Promise<void>
  onRequest<TParams, TResult>(
    method: string,
    handler: (params: TParams) => TResult | Promise<TResult>,
  ): void
  onNotification(method: string, handler: (params: unknown) => void): void
}

export const createLSPServerInstance = (
  name: string,
  config: ScopedLspServerConfig,
): LSPServerInstance => {
  let state: LspServerState = 'stopped'
  let crashRecoveryCount = 0
  const client = createLSPClient(name, () => {
    state = 'error'
  })

  const start = async () => {
    if (state === 'running' || state === 'starting') return
    const maxRestarts = config.maxRestarts ?? 3
    if (state === 'error' && crashRecoveryCount > maxRestarts) {
      throw new Error(`LSP server '${name}' exceeded max crash recovery attempts (${maxRestarts})`)
    }

    state = 'starting'
    try {
      await client.start(config.command, config.args || [], {
        env: config.env,
        cwd: config.workspaceFolder,
      })

      const workspaceFolder = config.workspaceFolder || process.cwd()
      const workspaceUri = pathToFileURL(workspaceFolder).href
      const initParams: InitializeParams = {
        processId: process.pid,
        initializationOptions: config.initializationOptions ?? {},
        workspaceFolders: [{ uri: workspaceUri, name: path.basename(workspaceFolder) }],
        rootPath: workspaceFolder,
        rootUri: workspaceUri,
        capabilities: {
          workspace: { configuration: false, workspaceFolders: false },
          textDocument: {
            synchronization: { dynamicRegistration: false, willSave: false, willSaveWaitUntil: false, didSave: true },
            publishDiagnostics: { relatedInformation: true },
            hover: { dynamicRegistration: false, contentFormat: ['markdown', 'plaintext'] },
            definition: { dynamicRegistration: false, linkSupport: true },
            references: { dynamicRegistration: false },
            documentSymbol: { dynamicRegistration: false, hierarchicalDocumentSymbolSupport: true },
            callHierarchy: { dynamicRegistration: false },
          },
          general: { positionEncodings: ['utf-16'] },
        },
      }

      const initPromise = client.initialize(initParams)
      if (config.startupTimeout !== undefined) {
        await withTimeout(initPromise, config.startupTimeout, `LSP server '${name}' init timed out`)
      } else {
        await initPromise
      }

      client.onRequest('workspace/configuration', (params: { items: unknown[] }) =>
        (params.items as unknown[]).map(() => null),
      )

      state = 'running'
      crashRecoveryCount = 0
    } catch (e) {
      await client.stop().catch(() => {})
      state = 'error'
      throw e
    }
  }

  const stop = async () => {
    if (state === 'stopped' || state === 'stopping') return
    state = 'stopping'
    await client.stop()
    state = 'stopped'
  }

  const isHealthy = () => state === 'running' && client.isInitialized

  const sendRequest = async <T>(method: string, params: unknown): Promise<T> => {
    if (!isHealthy()) {
      throw new Error(`Cannot send request to LSP server '${name}': server is ${state}`)
    }
    let lastErr: Error | undefined
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        return await client.sendRequest<T>(method, params)
      } catch (error) {
        lastErr = error as Error
        const code = (error as { code?: number }).code
        if (code === LSP_ERROR_CONTENT_MODIFIED && attempt < MAX_RETRIES) {
          await sleep(RETRY_BASE_MS * 2 ** attempt)
          continue
        }
        break
      }
    }
    throw new Error(`LSP request '${method}' failed for server '${name}': ${lastErr?.message ?? 'unknown'}`)
  }

  return {
    get name() {
      return name
    },
    get config() {
      return config
    },
    get state() {
      return state
    },
    start,
    stop,
    sendRequest,
    sendNotification: (m, p) => client.sendNotification(m, p),
    onRequest: (m, h) => client.onRequest(m, h),
    onNotification: (m, h) => client.onNotification(m, h),
  }
}
