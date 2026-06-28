import * as path from 'node:path'
import { pathToFileURL } from 'node:url'
import { loadLspConfig } from './lsp-config'
import { createLSPServerInstance, type LSPServerInstance } from './lsp-server-instance'
import type { ScopedLspServerConfig } from './types'

export type LSPServerManager = {
  initialize(projectRoot: string): Promise<void>
  shutdown(): Promise<void>
  sendRequest<T>(filePath: string, method: string, params: unknown): Promise<T | undefined>
  sendNotification(filePath: string, method: string, params: unknown): Promise<void>
  openFile(filePath: string, content: string, version?: number): Promise<void>
  changeFile(filePath: string, version: number, content: string): Promise<void>
  closeFile(filePath: string): Promise<void>
  isFileOpen(filePath: string): boolean
  getAllServers(): Map<string, LSPServerInstance>
  getLanguageId(filePath: string): string | undefined
}

export const createLSPServerManager = (): LSPServerManager => {
  const servers = new Map<string, LSPServerInstance>()
  const extensionMap = new Map<string, string[]>()
  const openedFiles = new Map<string, string>()
  const fileVersions = new Map<string, number>()

  const initialize = async (projectRoot: string) => {
    servers.clear()
    extensionMap.clear()
    openedFiles.clear()
    fileVersions.clear()

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
    fileVersions.clear()
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

  const sendNotification = async (filePath: string, method: string, params: unknown) => {
    const server = await ensureServerStarted(filePath)
    if (!server) return
    await server.sendNotification(method, params)
  }

  const getLanguageId = (filePath: string): string | undefined => {
    const server = getServerForFile(filePath)
    if (!server) return undefined
    const ext = path.extname(filePath).toLowerCase()
    return server.config.extensionToLanguage[ext] || 'plaintext'
  }

  const openFile = async (filePath: string, content: string, version = 1) => {
    const server = await ensureServerStarted(filePath)
    if (!server) return
    const fileUri = pathToFileURL(path.resolve(filePath)).href
    const ext = path.extname(filePath).toLowerCase()
    const languageId = server.config.extensionToLanguage[ext] || 'plaintext'
    await server.sendNotification('textDocument/didOpen', {
      textDocument: { uri: fileUri, languageId, version, text: content },
    })
    openedFiles.set(fileUri, server.name)
    fileVersions.set(fileUri, version)
  }

  const changeFile = async (filePath: string, version: number, content: string) => {
    const server = await ensureServerStarted(filePath)
    if (!server) return
    const fileUri = pathToFileURL(path.resolve(filePath)).href
    if (!openedFiles.has(fileUri)) {
      await openFile(filePath, content, version)
      return
    }
    await server.sendNotification('textDocument/didChange', {
      textDocument: { uri: fileUri, version },
      contentChanges: [{ text: content }],
    })
    fileVersions.set(fileUri, version)
  }

  const closeFile = async (filePath: string) => {
    const fileUri = pathToFileURL(path.resolve(filePath)).href
    if (!openedFiles.has(fileUri)) return
    const server = await ensureServerStarted(filePath)
    if (server) {
      await server.sendNotification('textDocument/didClose', {
        textDocument: { uri: fileUri },
      })
    }
    openedFiles.delete(fileUri)
    fileVersions.delete(fileUri)
  }

  return {
    initialize,
    shutdown,
    sendRequest,
    sendNotification,
    openFile,
    changeFile,
    closeFile,
    isFileOpen,
    getLanguageId,
    getAllServers: () => servers,
  }
}
