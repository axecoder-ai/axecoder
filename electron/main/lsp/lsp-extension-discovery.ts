import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import type { ScopedLspServerConfig } from './types'

type ExtensionPackage = {
  name?: string
  publisher?: string
}

type ExtensionRule = {
  serverName: string
  extensionToLanguage: Record<string, string>
  resolve: (extDir: string) => { command: string; args: string[] } | null
}

const exe = (name: string) => (process.platform === 'win32' ? `${name}.exe` : name)

const fileExists = async (p: string): Promise<boolean> => {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

const EXTENSION_RULES: Record<string, ExtensionRule> = {
  'rust-lang.rust-analyzer': {
    serverName: 'rust-analyzer',
    extensionToLanguage: { '.rs': 'rust' },
    resolve: (extDir) => {
      const bin = path.join(extDir, 'server', exe('rust-analyzer'))
      return { command: bin, args: [] }
    },
  },
  'golang.go': {
    serverName: 'gopls',
    extensionToLanguage: { '.go': 'go' },
    resolve: () => ({ command: 'gopls', args: ['serve'] }),
  },
  'ms-python.python': {
    serverName: 'pylsp',
    extensionToLanguage: { '.py': 'python', '.pyi': 'python' },
    resolve: () => ({ command: 'pylsp', args: [] }),
  },
  'vscode.typescript-language-features': {
    serverName: 'typescript',
    extensionToLanguage: {
      '.ts': 'typescript',
      '.tsx': 'typescriptreact',
      '.js': 'javascript',
      '.jsx': 'javascriptreact',
      '.mts': 'typescript',
      '.cts': 'typescript',
    },
    resolve: () => ({ command: 'typescript-language-server', args: ['--stdio'] }),
  },
  'ms-vscode.vscode-typescript-next': {
    serverName: 'typescript',
    extensionToLanguage: {
      '.ts': 'typescript',
      '.tsx': 'typescriptreact',
      '.js': 'javascript',
      '.jsx': 'javascriptreact',
    },
    resolve: () => ({ command: 'typescript-language-server', args: ['--stdio'] }),
  },
}

const extensionRoots = (): string[] => {
  const home = os.homedir()
  return [
    path.join(home, '.vscode', 'extensions'),
    path.join(home, '.cursor', 'extensions'),
  ]
}

const matchExtensionId = (folderName: string, id: string): boolean =>
  folderName === id || folderName.startsWith(`${id}-`)

const readExtensionPackage = async (extDir: string): Promise<ExtensionPackage | null> => {
  try {
    const raw = await fs.readFile(path.join(extDir, 'package.json'), 'utf-8')
    return JSON.parse(raw) as ExtensionPackage
  } catch {
    return null
  }
}

export const discoverExtensionServers = async (): Promise<Record<string, ScopedLspServerConfig>> => {
  const merged: Record<string, ScopedLspServerConfig> = {}

  for (const root of extensionRoots()) {
    let entries: string[] = []
    try {
      entries = await fs.readdir(root)
    } catch {
      continue
    }

    for (const folder of entries) {
      const extDir = path.join(root, folder)
      let st
      try {
        st = await fs.stat(extDir)
      } catch {
        continue
      }
      if (!st.isDirectory()) continue

      const pkg = await readExtensionPackage(extDir)
      const idFromPkg =
        pkg?.publisher && pkg?.name ? `${pkg.publisher}.${pkg.name}` : null

      for (const [ruleId, rule] of Object.entries(EXTENSION_RULES)) {
        if (!matchExtensionId(folder, ruleId) && idFromPkg !== ruleId) continue
        const cmd = rule.resolve(extDir)
        if (!cmd) continue
        const isAbs = path.isAbsolute(cmd.command) || cmd.command.includes(path.sep)
        if (isAbs && !(await fileExists(cmd.command))) continue
        merged[rule.serverName] = {
          command: cmd.command,
          args: cmd.args,
          extensionToLanguage: rule.extensionToLanguage,
        }
      }
    }
  }

  return merged
}
