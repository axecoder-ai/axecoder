import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { axecoderPath, getAxecoderDir } from '../axecoder-dir'
import { axeCoderRppitRuntimeAddon } from './rppit-axecoder-addon'

let rppitPathsOverride: string[] | null = null
let rppitCache: { path: string; mtimeMs: number; text: string } | null = null
let rppitConfigPathOverride: string | null = null

export const setRppitCommandPathsForTests = (paths: string[] | null) => {
  rppitPathsOverride = paths
  rppitCache = null
}

export const setRppitConfigPathForTests = (configPath: string | null) => {
  rppitConfigPathOverride = configPath
}

export interface RppitConfig {
  deliverables_root?: string
  merged_doc_suffix?: string
}

const defaultRppitConfig: RppitConfig = {
  deliverables_root: 'docs/deliverables',
  merged_doc_suffix: '交付总结',
}

const builtinRppitPath = () => {
  const appRoot = process.env.APP_ROOT ?? path.resolve(import.meta.dirname, '../../..')
  return path.join(appRoot, 'resources', 'builtin-commands', 'rppit.md')
}

const getRppitConfigPath = (projectRoot: string): string => {
  if (rppitConfigPathOverride !== null) return rppitConfigPathOverride
  return path.join(projectRoot, '.cursor', 'rppit.json')
}

/** 加载 .cursor/rppit.json 配置文件 */
export const loadRppitConfig = async (
  projectRoot?: string,
): Promise<{ ok: true; config: RppitConfig } | { ok: false; error: string }> => {
  const configPath = getRppitConfigPath(projectRoot ?? process.cwd())
  try {
    const content = await fs.readFile(configPath, 'utf-8')
    const parsed = JSON.parse(content)
    return {
      ok: true,
      config: {
        deliverables_root: parsed.deliverables_root ?? defaultRppitConfig.deliverables_root,
        merged_doc_suffix: parsed.merged_doc_suffix ?? defaultRppitConfig.merged_doc_suffix,
      },
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === 'ENOENT') {
      // 文件不存在，返回默认配置
      return { ok: true, config: { ...defaultRppitConfig } }
    }
    return {
      ok: false,
      error: `Invalid JSON in ${configPath}: ${(err as Error).message}`,
    }
  }
}

/** 解析交付物根目录（优先级：用户指定 > rppit.json > 默认） */
export const parseDeliverablesRoot = async (
  userOverride: string | undefined,
  projectRoot?: string,
): Promise<string> => {
  if (userOverride) return userOverride

  const cfg = await loadRppitConfig(projectRoot)
  if (cfg.ok) {
    return cfg.config.deliverables_root!
  }

  return defaultRppitConfig.deliverables_root!
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
  const playbook = `${rppitText.trim()}\n\n${axeCoderRppitRuntimeAddon()}`
  const userPart = userContent.trim()
  return userPart ? `${playbook}\n\n---\n\nUser notes:\n${userPart}` : playbook
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
