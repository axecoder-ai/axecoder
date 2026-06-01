import fs from 'node:fs/promises'
import { spawn } from 'node:child_process'
import { axecoderPath, ensureAxecoderDir } from '../axecoder-dir'
import type { AgentToolName } from './agent-types'

export type HookEvent = 'PreToolUse' | 'PostToolUse' | 'UserPromptSubmit'

export type HookRule = {
  matcher?: string
  command: string
}

export type HooksFile = Partial<Record<HookEvent, HookRule[]>>

const hooksPath = () => axecoderPath('hooks.json')

export const loadHooksFile = async (): Promise<HooksFile> => {
  try {
    const raw = await fs.readFile(hooksPath(), 'utf-8')
    return JSON.parse(raw) as HooksFile
  } catch {
    return {}
  }
}

export const saveHooksFile = async (file: HooksFile) => {
  await ensureAxecoderDir()
  await fs.writeFile(hooksPath(), JSON.stringify(file, null, 2), 'utf-8')
}

const matchTool = (matcher: string | undefined, toolName: string) => {
  if (!matcher || matcher === '*') return true
  return matcher === toolName || toolName.toLowerCase().includes(matcher.toLowerCase())
}

const runHookCommand = async (
  projectRoot: string,
  command: string,
  env: Record<string, string>,
): Promise<{ ok: true; stdout: string } | { ok: false; blocked: boolean; message: string }> => {
  const cmd = command.trim()
  if (!cmd) return { ok: true, stdout: '' }

  return new Promise((resolve) => {
    const isWin = process.platform === 'win32'
    const shell = isWin ? process.env.COMSPEC || 'cmd.exe' : process.env.SHELL || '/bin/sh'
    const shellArgs = isWin ? ['/d', '/s', '/c', cmd] : ['-lc', cmd]

    const proc = spawn(shell, shellArgs, {
      cwd: projectRoot,
      env: { ...process.env, ...env },
      stdio: ['ignore', 'pipe', 'pipe'],
    })

    let stdout = ''
    let stderr = ''
    proc.stdout?.on('data', (c) => {
      stdout += c.toString()
    })
    proc.stderr?.on('data', (c) => {
      stderr += c.toString()
    })
    proc.on('close', (code) => {
      if (code !== 0) {
        resolve({
          ok: false,
          blocked: true,
          message: stderr.trim() || stdout.trim() || `Hook exited with code ${code}`,
        })
        return
      }
      resolve({ ok: true, stdout: stdout.trim() })
    })
    proc.on('error', (e) => {
      resolve({ ok: false, blocked: true, message: e.message })
    })
  })
}

export const runHooks = async (
  event: HookEvent,
  projectRoot: string,
  ctx: { toolName?: AgentToolName; userPrompt?: string },
): Promise<
  | { ok: true; notes: string[] }
  | { ok: false; blocked: true; message: string }
> => {
  const file = await loadHooksFile()
  const rules = file[event] ?? []
  const notes: string[] = []

  for (const rule of rules) {
    if (event === 'PreToolUse' || event === 'PostToolUse') {
      if (!matchTool(rule.matcher, ctx.toolName ?? '')) continue
    }
    const res = await runHookCommand(projectRoot, rule.command, {
      AXECODER_HOOK_EVENT: event,
      AXECODER_TOOL_NAME: ctx.toolName ?? '',
    })
    if (!res.ok) {
      return { ok: false, blocked: true, message: res.message }
    }
    if (res.stdout) notes.push(res.stdout)
  }

  return { ok: true, notes }
}

export const formatHooksHelp = async () => {
  const file = await loadHooksFile()
  const lines = [`Hooks config: ${hooksPath()}`, '']
  for (const ev of ['PreToolUse', 'PostToolUse', 'UserPromptSubmit'] as HookEvent[]) {
    const rules = file[ev] ?? []
    lines.push(`## ${ev} (${rules.length})`)
    for (const r of rules) {
      lines.push(`- matcher: ${r.matcher ?? '*'} → \`${r.command}\``)
    }
    lines.push('')
  }
  if (lines.length <= 2) lines.push('(no hooks configured)')
  return lines.join('\n')
}
