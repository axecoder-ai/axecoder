import type { SlashCommandDef } from './types'
import { registerWorkflowBuiltinCommands } from './workflow-builtin'

export const registerBuiltinSlashCommands = (): SlashCommandDef[] => [
  {
    name: 'model',
    description: 'Open model settings or switch activeModelId',
    run: async (ctx, args) => {
      const id = args.trim()
      if (!id) {
        ctx.openModelsSettings()
        return { ok: true, message: 'Opened model settings。' }
      }
      const res = await ctx.setActiveModel(id)
      if (!res.ok) {
        const ids = ctx
          .getModelsFile()
          .models.filter((m) => m.enabled)
          .map((m) => m.id)
          .join(', ')
        return { ok: false, message: `Unknown or disabled model id: ${id}. Available: ${ids || '(none)'}` }
      }
      if (res.data) ctx.setModelsFile(res.data)
      return { ok: true, message: `Switched model to: ${id}` }
    },
  },
  {
    name: 'compact',
    description: 'Compact session context (drop older messages)',
    run: async (ctx) => {
      const s = ctx.getSession()
      if (!s) return { ok: false, message: 'No active session' }
      const apiMessages = s.messages.map((m) => ({
        role: m.role === 'assistant' ? ('assistant' as const) : ('user' as const),
        content: m.apiContent ?? m.text,
      }))
      const res = await window.axecoder.chatCompact(apiMessages)
      if (!res.ok) return { ok: false, message: res.error ?? 'Compact failed' }
      const next = res.messages ?? apiMessages
      s.messages = next.map((m) => ({
        role: m.role === 'assistant' ? 'assistant' : 'user',
        text: m.content,
      }))
      s.updatedAt = Date.now()
      ctx.setSession(s)
      await ctx.persist()
      return {
        ok: true,
        message: res.summary ? `Compacted: ${res.summary}` : 'Session context compacted.',
      }
    },
  },
  {
    name: 'hooks',
    description: 'Show Agent hooks configuration help',
    run: async () => {
      const res = await window.axecoder.agentHooksHelp()
      if (!res.ok) return { ok: false, message: res.error ?? 'Could not read hooks' }
      return { ok: true, message: res.text ?? '(empty)' }
    },
  },
  {
    name: 'mcp',
    description: 'List MCP servers (from mcp.json)',
    run: async () => {
      const res = await window.axecoder.agentListMcp()
      if (!res.ok) return { ok: false, message: res.error ?? 'Could not read MCP' }
      return { ok: true, message: res.text }
    },
  },
  {
    name: 'plan',
    description: 'Plan mode help (EnterPlanMode / ExitPlanMode)',
    run: async () => {
      const res = await window.axecoder.agentPlanModeHelp()
      if (!res.ok) return { ok: false, message: res.error ?? 'Could not read' }
      return { ok: true, message: res.text }
    },
  },
  {
    name: 'skills',
    description: 'List skills under .cursor/skills',
    run: async (ctx) => {
      const res = await window.axecoder.agentListSkills(ctx.projectRoot)
      if (!res.ok) return { ok: false, message: res.error ?? 'Could not list skills' }
      if (!res.skills.length) {
        return {
          ok: true,
          message: 'No skills found. Add under `.cursor/skills/<name>/SKILL.md` or `~/.cursor/skills/`.',
        }
      }
      const lines = res.skills.map(
        (s) => `/${s.name} — ${s.source} (${s.path})`,
      )
      return {
        ok: true,
        message: `Found ${res.skills.length} skill(s) (or /skillname to load):\n\n${lines.join('\n')}`,
      }
    },
  },
  {
    name: 'rewind',
    description: 'Rewind to Agent checkpoint or show Git status',
    run: async (ctx, args) => {
      const agentId = ctx.getAgentSessionId?.()
      const cpId = args.trim()
      if (agentId) {
        const res = await window.axecoder.agentRewind(agentId, cpId || undefined)
        if (res.ok) {
          return {
            ok: true,
            message: `Rewound to "${res.label}", restored ${res.restoredFiles} file snapshot(s).`,
          }
        }
        if (cpId) return { ok: false, message: res.error ?? 'Rewind failed' }
      }
      const list = agentId
        ? await window.axecoder.agentListCheckpoints(agentId)
        : null
      const help = await window.axecoder.agentRewindHelp(ctx.projectRoot)
      if (!help.ok) return { ok: false, message: help.error ?? 'Could not get rewind info' }
      const cpLines =
        list?.ok && list.checkpoints.length
          ? [
              '',
              'Checkpoints (`/rewind <id>`):',
              ...list.checkpoints.map(
                (c) => `- ${c.id} — ${c.label}（${c.fileCount} files)`,
              ),
            ].join('\n')
          : agentId
            ? '\n\n(no checkpoints for this Agent session yet)'
            : '\n\n(run an Agent turn first, then /rewind)'
      return { ok: true, message: help.text + cpLines }
    },
  },
  {
    name: 'resume',
    description: 'List in-memory active Agent sessions',
    run: async () => {
      const res = await window.axecoder.agentListSessions()
      if (!res.ok || !res.sessions.length) {
        return {
          ok: true,
          message:
            'No active Agent sessions in memory (restart clears them; send a message to start).',
        }
      }
      const lines = res.sessions.map(
        (s) =>
          `- ${s.id} — Turn ${s.turn} turns, ${s.messageCount} messages, project ${s.projectRoot}`,
      )
      return { ok: true, message: `Active Agent sessions:\n\n${lines.join('\n')}` }
    },
  },
  {
    name: 'export',
    description: 'Export current chat session as JSON',
    run: async (ctx) => {
      const s = ctx.getSession()
      if (!s) return { ok: false, message: 'No active session' }
      const json = JSON.stringify(s, null, 2)
      try {
        await navigator.clipboard.writeText(json)
        return {
          ok: true,
          message: `Copied session JSON to clipboard (${s.messages.length} messages).`,
        }
      } catch {
        return {
          ok: true,
          message: `Session JSON:\n\n\`\`\`json\n${json.slice(0, 4000)}${json.length > 4000 ? '\n…(truncated)' : ''}\n\`\`\``,
        }
      }
    },
  },
  {
    name: 'init',
    description: 'Create AGENTS.md template at project root',
    run: async (ctx) => {
      const res = await window.axecoder.agentInitAgentsMd(ctx.projectRoot)
      if (!res.ok) return { ok: false, message: res.error ?? 'failed' }
      return {
        ok: true,
        message: res.created
          ? `Created ${res.path}`
          : `Already exists ${res.path}(not overwritten)`,
      }
    },
  },
  {
    name: 'memory',
    description: 'View or write ~/.axecoder/memory.md',
    run: async (_ctx, args) => {
      const text = args.trim()
      if (!text) {
        const res = await window.axecoder.agentReadMemory()
        if (!res.ok) return { ok: false, message: res.error ?? 'Read failed' }
        const body = res.text.trim() || '(empty)'
        return { ok: true, message: `Memory (${res.path}):\n\n${body}` }
      }
      if (text.startsWith('set ')) {
        const content = text.slice(4)
        const w = await window.axecoder.agentWriteMemory(content)
        if (!w.ok) return { ok: false, message: w.error ?? 'Write failed' }
        return { ok: true, message: `Wrote ${w.path}` }
      }
      return {
        ok: true,
        message:
          'Usage: /memory to view; /memory set <text> to overwrite ~/.axecoder/memory.md',
      }
    },
  },
  {
    name: 'style',
    aliases: ['output-style'],
    description: 'List or switch Agent output style (incl. custom output-styles)',
    run: async (ctx, args) => {
      const id = args.trim()
      const listRes = await window.axecoder.agentListOutputStyles(ctx.projectRoot)
      if (!listRes.ok) return { ok: false, message: listRes.error ?? 'Could not list styles' }
      if (!id) {
        const lines = listRes.styles.map((s) => {
          const active = s.id === listRes.activeId ? ' ← active' : ''
          return `- ${s.id} (${s.source})${active}: ${s.description}`
        })
        return {
          ok: true,
          message: [
            'Output style directories:',
            ...listRes.dirs.map((d) => `  ${d}`),
            '',
            lines.join('\n'),
            '',
            'Switch: /style <id> (e.g. /style Explanatory or custom slug)',
          ].join('\n'),
        }
      }
      const setRes = await window.axecoder.agentSetOutputStyle(id)
      if (!setRes.ok) return { ok: false, message: setRes.error ?? 'Failed to set' }
      return { ok: true, message: `Switched output style to: ${setRes.activeId}` }
    },
  },
  ...registerWorkflowBuiltinCommands(),
]
