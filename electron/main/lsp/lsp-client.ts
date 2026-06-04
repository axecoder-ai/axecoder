import { type ChildProcess, spawn } from 'node:child_process'
import {
  createMessageConnection,
  type MessageConnection,
  StreamMessageReader,
  StreamMessageWriter,
} from 'vscode-jsonrpc/node.js'
import type { InitializeParams, InitializeResult, ServerCapabilities } from 'vscode-languageserver-protocol'

export type LSPClient = {
  readonly capabilities: ServerCapabilities | undefined
  readonly isInitialized: boolean
  start: (
    command: string,
    args: string[],
    options?: { env?: Record<string, string>; cwd?: string },
  ) => Promise<void>
  initialize: (params: InitializeParams) => Promise<InitializeResult>
  sendRequest: <TResult>(method: string, params: unknown) => Promise<TResult>
  sendNotification: (method: string, params: unknown) => Promise<void>
  onRequest: <TParams, TResult>(
    method: string,
    handler: (params: TParams) => TResult | Promise<TResult>,
  ) => void
  stop: () => Promise<void>
}

export const createLSPClient = (serverName: string, onCrash?: (error: Error) => void): LSPClient => {
  let proc: ChildProcess | undefined
  let connection: MessageConnection | undefined
  let capabilities: ServerCapabilities | undefined
  let isInitialized = false
  let startFailed = false
  let startError: Error | undefined
  let isStopping = false

  const pendingRequestHandlers: Array<{
    method: string
    handler: (params: unknown) => unknown | Promise<unknown>
  }> = []

  const checkStartFailed = () => {
    if (startFailed) throw startError || new Error(`LSP server ${serverName} failed to start`)
  }

  return {
    get capabilities() {
      return capabilities
    },
    get isInitialized() {
      return isInitialized
    },

    async start(command, args, options) {
      proc = spawn(command, args, {
        stdio: ['pipe', 'pipe', 'pipe'],
        env: { ...process.env, ...options?.env },
        cwd: options?.cwd,
        windowsHide: true,
      })

      if (!proc.stdout || !proc.stdin) throw new Error('LSP server process stdio not available')

      await new Promise<void>((resolve, reject) => {
        const onSpawn = () => {
          cleanup()
          resolve()
        }
        const onError = (err: Error) => {
          cleanup()
          reject(err)
        }
        const cleanup = () => {
          proc?.removeListener('spawn', onSpawn)
          proc?.removeListener('error', onError)
        }
        proc!.once('spawn', onSpawn)
        proc!.once('error', onError)
      })

      proc.on('exit', (code) => {
        if (code !== 0 && code !== null && !isStopping) {
          isInitialized = false
          const crashError = new Error(`LSP server ${serverName} crashed with exit code ${code}`)
          onCrash?.(crashError)
        }
      })

      const reader = new StreamMessageReader(proc.stdout)
      const writer = new StreamMessageWriter(proc.stdin)
      connection = createMessageConnection(reader, writer)
      connection.listen()

      for (const { method, handler } of pendingRequestHandlers) {
        connection.onRequest(method, handler)
      }
      pendingRequestHandlers.length = 0
    },

    async initialize(params) {
      if (!connection) throw new Error('LSP client not started')
      checkStartFailed()
      const result = await connection.sendRequest<InitializeResult>('initialize', params)
      capabilities = result.capabilities
      await connection.sendNotification('initialized', {})
      isInitialized = true
      return result
    },

    async sendRequest(method, params) {
      if (!connection) throw new Error('LSP client not started')
      checkStartFailed()
      if (!isInitialized) throw new Error('LSP server not initialized')
      return connection.sendRequest(method, params)
    },

    async sendNotification(method, params) {
      if (!connection) throw new Error('LSP client not started')
      checkStartFailed()
      try {
        await connection.sendNotification(method, params)
      } catch {
        /* fire-and-forget */
      }
    },

    onRequest(method, handler) {
      if (!connection) {
        pendingRequestHandlers.push({
          method,
          handler: handler as (params: unknown) => unknown | Promise<unknown>,
        })
        return
      }
      connection.onRequest(method, handler)
    },

    async stop() {
      isStopping = true
      try {
        if (connection) {
          await connection.sendRequest('shutdown', {})
          await connection.sendNotification('exit', {})
        }
      } catch {
        /* continue cleanup */
      } finally {
        connection?.dispose()
        connection = undefined
        if (proc) {
          proc.removeAllListeners()
          try {
            proc.kill()
          } catch {
            /* dead */
          }
          proc = undefined
        }
        isInitialized = false
        capabilities = undefined
        isStopping = false
      }
    },
  }
}
