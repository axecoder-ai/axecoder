import { createRequire } from 'node:module'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const require = createRequire(import.meta.url)

let distRootCache: string | null = null

const electronApp = (): { isPackaged: boolean; getAppPath: () => string } | null => {
  try {
    const { app } = require('electron') as typeof import('electron')
    return app
  } catch {
    return null
  }
}

/** 开发：electron/main/codegraph/dist；打包：resources/codegraph */
export const resolveCodeGraphDistRoot = (): string => {
  if (distRootCache) return distRootCache

  const candidates: string[] = []
  if (process.env.APP_ROOT) {
    candidates.push(path.join(process.env.APP_ROOT, 'electron/main/codegraph/dist'))
  }
  const app = electronApp()
  if (app?.isPackaged) {
    candidates.push(path.join(process.resourcesPath, 'codegraph'))
  }
  if (app) {
    candidates.push(path.join(app.getAppPath(), 'electron/main/codegraph/dist'))
  }
  const here = path.dirname(fileURLToPath(import.meta.url))
  candidates.push(path.join(here, 'dist'))

  for (const dir of candidates) {
    if (fs.existsSync(path.join(dir, 'index.js'))) {
      distRootCache = dir
      return dir
    }
  }

  throw new Error(
    'CodeGraph 引擎未找到（缺少 electron/main/codegraph/dist）。开发请重新 npm run dev；打包请确认 codegraph:build 已执行。',
  )
}

export type VendoredCodeGraph = {
  init: (projectRoot: string, options?: { index?: boolean; onProgress?: (p: unknown) => void }) => Promise<unknown>
  open: (projectRoot: string, options?: { sync?: boolean }) => Promise<unknown>
  isInitialized: (projectRoot: string) => boolean
}

export type VendoredToolHandler = {
  execute: (toolName: string, args: Record<string, unknown>) => Promise<{
    content: Array<{ type: 'text'; text: string }>
    isError?: boolean
  }>
  setDefaultCodeGraph: (cg: unknown) => void
}

let codeGraphMod: { default: VendoredCodeGraph } | null = null
let toolsMod: { ToolHandler: new (cg: unknown) => VendoredToolHandler } | null = null

export const loadVendoredCodeGraph = (): VendoredCodeGraph => {
  if (!codeGraphMod) {
    const distRoot = resolveCodeGraphDistRoot()
    codeGraphMod = require(path.join(distRoot, 'index.js')) as { default: VendoredCodeGraph }
  }
  return codeGraphMod.default
}

export const createVendoredToolHandler = (cg: unknown): VendoredToolHandler => {
  if (!toolsMod) {
    const distRoot = resolveCodeGraphDistRoot()
    toolsMod = require(path.join(distRoot, 'mcp', 'tools.js')) as {
      ToolHandler: new (cg: unknown) => VendoredToolHandler
    }
  }
  const handler = new toolsMod.ToolHandler(cg)
  handler.setDefaultCodeGraph(cg)
  return handler
}

export const isNodeSqliteAvailable = (): boolean => {
  try {
    require('node:sqlite')
    return true
  } catch {
    try {
      require('better-sqlite3')
      return true
    } catch {
      return false
    }
  }
}

export const getCodeGraphDistRoot = () => resolveCodeGraphDistRoot()
