import * as path from 'node:path'
import { pathToFileURL } from 'node:url'
import { loadLspConfig } from './lsp-config'
import { createLSPServerInstance, type LSPServerInstance } from './lsp-server-instance'
import type { ScopedLspServerConfig } from './types'

export type LSPServerManager = {
  initialize(projectRoot: string): Promise<void>
  shutdown(): Promise<void>
  sendRequest<T>(filePath: string, method: string, params: unknown): Promise<T | undefined>
  openFile(filePath: string, content: string): Promise<void>
  isFileOpen(filePath: string): boolean
  getAllServers(): Map<string, LSPServerInstance>
}

export const createLSPServerManager = (): LSPServerManager => {
  const servers = new Map<string, LSPServerInstance>()
  const extensionMap = new Map<string, string[]>()
  const openedFiles = new Map<string, string>()

  const initialize = async (projectRoot: string) => {
    servers.clear()
    extensionMap.clear()
    openedFiles.clear()

    const { servers: serverConfigs } = await loadLspConfig(projectRoot)
    for (const [serverName, raw] of Object.entries(serverConfigs)) {
      const config: ScopedLspServerConfig = {
        ...raw,
        workspaceFolder: raw.workspaceFolder || projectRoot,
      }
      if (!config.command) continue
      if (!config.extensionToLanguage || !Object.keys(config.extensionToLanguage).length) continue

      for (const ext of Object.keys(config.extensionToLanguage)) {
        const normalized = ext.toLowerCase()
        const list = extensionMap.get(normalized) ?? []
        list.push(serverName)
        extensionMap.set(normalized, list)
      }

      servers.set(serverName, createLSPServerInstance(serverName, config))
    }
  }

  const shutdown = async () => {
    await Promise.allSettled([...servers.values()].map((s) => s.stop()))
    servers.clear()
    extensionMap.clear()
    openedFiles.clear()
  }

  const getServerForFile = (filePath: string): LSPServerInstance | undefined => {
    const ext = path.extname(filePath).toLowerCase()
    const names = extensionMap.get(ext)
    if (!names?.length) return undefined
    return servers.get(names[0]!)
  }

  const ensureServerStarted = async (filePath: string): Promise<LSPServerInstance | undefined> => {
    const server = getServerForFile(filePath)
    if (!server) return undefined
    if (server.state === 'stopped' || server.state === 'error') {
      await server.start()
    }
    return server
  }

  const sendRequest = async <T>(filePath: string, method: string, params: unknown): Promise<T | undefined> => {
    const server = await ensureServerStarted(filePath)
    if (!server) return undefined
    return server.sendRequest<T>(method, params)
  }

  const isFileOpen = (filePath: string) => {
    const uri = pathToFileURL(path.resolve(filePath)).href
    return openedFiles.has(uri)
  }

  const openFile = async (filePath: string, content: string) => {
    const server = await ensureServerStarted(filePath)
    if (!server) return
    const fileUri = pathToFileURL(path.resolve(filePath)).href
    if (openedFiles.get(fileUri) === server.name) return

    const ext = path.extname(filePath).toLowerCase()
    const languageId = server.config.extensionToLanguage[ext] || 'plaintext'
    await server.sendNotification('textDocument/didOpen', {
      textDocument: { uri: fileUri, languageId, version: 1, text: content },
    })
    openedFiles.set(fileUri, server.name)
  }

  return {
    initialize,
    shutdown,
    sendRequest,
    openFile,
    isFileOpen,
    getAllServers: () => servers,
  }
}
