import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { axecoderPath, getAxecoderDir } from '../axecoder-dir'

let rppitPathsOverride: string[] | null = null
let rppitCache: { path: string; mtimeMs: number; text: string } | null = null

export const setRppitCommandPathsForTests = (paths: string[] | null) => {
  rppitPathsOverride = paths
  rppitCache = null
}

const builtinRppitPath = () => {
  const appRoot = process.env.APP_ROOT ?? path.resolve(import.meta.dirname, '../../..')
  return path.join(appRoot, 'resources', 'builtin-commands', 'rppit.md')
}

/** 与 /rppit 斜杠命令一致：Cursor 全局 → ~/.axecoder/commands → 内置 */
export const rppitCommandCandidatePaths = (): string[] => {
  if (rppitPathsOverride) return rppitPathsOverride
  return [
    path.join(os.homedir(), '.cursor', 'commands', 'rppit.md'),
    axecoderPath('commands/rppit.md'),
    builtinRppitPath(),
  ]
}

export const loadRppitCommandText = async (): Promise<
  { ok: true; text: string; path: string } | { ok: false; error: string }
> => {
  for (const p of rppitCommandCandidatePaths()) {
    try {
      const st = await fs.stat(p)
      if (rppitCache && rppitCache.path === p && rppitCache.mtimeMs === st.mtimeMs) {
        return { ok: true, text: rppitCache.text, path: p }
      }
      const text = (await fs.readFile(p, 'utf-8')).trim()
      if (!text) continue
      rppitCache = { path: p, mtimeMs: st.mtimeMs, text }
      return { ok: true, text, path: p }
    } catch {
      /* try next */
    }
  }
  return {
    ok: false,
    error: `rppit.md not found (tried: ${rppitCommandCandidatePaths().join(', ')})`,
  }
}

/** 与 workflow-builtin / registry-refresh 中自定义斜杠命令的 sendPrompt 格式一致 */
export const wrapUserMessageAsRppitCommand = (rppitText: string, userContent: string): string => {
  const userPart = userContent.trim()
  return userPart ? `${rppitText}\n\n---\n\nUser notes:\n${userPart}` : rppitText
}

export const applyRppitModeToLastUserMessage = async (
  messages: { role: string; content: string }[],
): Promise<{ ok: true; path: string } | { ok: false; error: string }> => {
  const loaded = await loadRppitCommandText()
  if (!loaded.ok) return loaded
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i]?.role !== 'user') continue
    messages[i] = {
      ...messages[i],
      content: wrapUserMessageAsRppitCommand(loaded.text, messages[i]!.content),
    }
    return { ok: true, path: loaded.path }
  }
  return { ok: false, error: 'No user message in history' }
}

export const rppitCommandsDirHint = () =>
  `~/.cursor/commands, ${path.join(getAxecoderDir(), 'commands')}, resources/builtin-commands`
