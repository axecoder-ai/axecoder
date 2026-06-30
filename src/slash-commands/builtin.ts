import type { SlashCommandDef } from './types'
import { registerWorkflowBuiltinCommands } from './workflow-builtin'
import {
  REASONING_EFFORT_LEVELS,
  normalizeReasoningEffort,
} from '../../shared/reasoning-effort'

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
      const modelId = s.modelId?.trim() || ctx.getModelsFile().activeModelId?.trim() || undefined
      const res = await window.axecoder.chatCompact(apiMessages, modelId, s.id)
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
    name: 'permissions',
    description: 'Open Agent permissions settings (global + project JSON)',
    run: async (ctx) => {
      ctx.openPermissionsSettings()
      return { ok: true, message: 'Opened Permissions settings.' }
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
    run: async (ctx) => {
      const res = await window.axecoder.agentListMcp(ctx.projectRoot)
      if (!res.ok) return { ok: false, message: res.error ?? 'Could not read MCP' }
      return { ok: true, message: res.text }
    },
  },
  {
    name: 'auto-plan',
    description: 'Toggle Agent auto-plan on/off (settings.agentAutoPlan)',
    run: async (_ctx, args) => {
      const mode = args.trim().toLowerCase()
      if (mode !== 'on' && mode !== 'off') {
        return {
          ok: false,
          message: 'Usage: /auto-plan on | off',
        }
      }
      await window.axecoder.setSettings({ agentAutoPlan: mode })
      return {
        ok: true,
        message:
          mode === 'on'
            ? 'Agent auto-plan enabled. Complex tasks may auto-enter read-only plan mode first.'
            : 'Agent auto-plan disabled.',
      }
    },
  },
  {
    name: 'effort',
    description: 'Set reasoning effort (auto | low | medium | high | max)',
    run: async (ctx, args) => {
      const raw = args.trim().toLowerCase()
      if (!raw) {
        const cur = ctx.getChatEffort?.() ?? 'medium'
        return {
          ok: true,
          message: `Current effort: ${cur}. Levels: ${REASONING_EFFORT_LEVELS.join(', ')}`,
        }
      }
      const level = normalizeReasoningEffort(raw)
      if (!REASONING_EFFORT_LEVELS.includes(level) || (raw !== 'auto' && level === 'auto')) {
        return {
          ok: false,
          message: `Unknown effort: ${args.trim()}. Use: ${REASONING_EFFORT_LEVELS.join(', ')}`,
        }
      }
      ctx.setChatEffort?.(level)
      const label = level === 'auto' ? 'auto (model default)' : level
      return { ok: true, message: `Reasoning effort set to ${label}.` }
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
    name: 'commit-push-pr',
    aliases: ['pr'],
    description: 'Commit, push, and create/update pull request (GitHub gh / Gitee API)',
    run: async (ctx) => {
      const res = await window.axecoder.gitCommitPushPrPrompt(ctx.projectRoot)
      if (!res.ok) return { ok: false, message: res.error ?? 'Could not build PR prompt' }
      return { ok: true, message: 'Starting commit-push-PR workflow…', sendPrompt: res.text }
    },
  },
  {
    name: 'investigate-ci',
    aliases: ['ci'],
    description: 'Investigate failing CI checks (gh + git-forge; GitStatus/GitDiff for local state)',
    run: async (ctx) => {
      const res = await window.axecoder.gitInvestigateCiPrompt(ctx.projectRoot)
      if (!res.ok) return { ok: false, message: res.error ?? 'Could not build CI prompt' }
      return { ok: true, message: 'Starting CI investigation…', sendPrompt: res.text }
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
    description: 'View project memory (AGENTS.md + .axecoder/memory)',
    run: async (ctx) => {
      const res = await window.axecoder.agentProjectMemory(ctx.projectRoot)
      if (!res.ok) return { ok: false, message: res.error ?? 'Read failed' }
      return { ok: true, message: res.text }
    },
  },
  {
    name: 'remember',
    description: 'Quick-save a note to project auto-memory',
    run: async (ctx, args) => {
      const note = args.trim()
      if (!note) {
        return { ok: true, message: 'Usage: /remember <note text>' }
      }
      return {
        ok: true,
        message: 'Saving memory…',
        sendPrompt: `Use the Remember tool to save this durable fact to project memory:\n\n${note}`,
      }
    },
  },
  {
    name: 'tree',
    description: 'Show conversation branches for this project',
    run: async (ctx) => {
      const sid = ctx.getSession?.()?.id
      const res = await window.axecoder.chatBranchTree(ctx.projectRoot, sid)
      if (!res.ok) return { ok: false, message: res.error ?? 'Failed' }
      return { ok: true, message: res.text }
    },
  },
  {
    name: 'branch',
    description: 'Fork chat: /branch [turn] [name]',
    run: async (ctx, args) => {
      const s = ctx.getSession()
      if (!s) return { ok: false, message: 'No active chat session' }
      const res = await window.axecoder.chatForkBranch(ctx.projectRoot, s.id, args)
      if (!res.ok) return { ok: false, message: res.error ?? 'Branch failed' }
      if (ctx.selectSession) {
        await ctx.selectSession(res.session.id)
      } else {
        ctx.setSession(res.session)
        await ctx.persist()
      }
      const tree = await window.axecoder.chatBranchTree(ctx.projectRoot, res.session.id)
      const treeText = tree.ok ? `\n\n${tree.text}` : ''
      return {
        ok: true,
        message: `Branched to ${res.session.id} (${res.session.title}).${treeText}`,
      }
    },
  },
  {
    name: 'switch',
    description: 'Switch to another conversation branch by id or name',
    run: async (ctx, args) => {
      const ref = args.trim()
      if (!ref) return { ok: false, message: 'Usage: /switch <branch id|name>' }
      const sid = ctx.getSession?.()?.id
      const res = await window.axecoder.chatSwitchBranch(ctx.projectRoot, ref, sid)
      if (!res.ok) return { ok: false, message: res.error ?? 'Switch failed' }
      if (ctx.selectSession) {
        await ctx.selectSession(res.session.id)
      } else {
        ctx.setSession(res.session)
        await ctx.persist()
      }
      return { ok: true, message: `Switched to ${res.session.id} (${res.session.title}).\n\n${res.tree}` }
    },
  },
  {
    name: 'design',
    description: 'Show project DESIGN.md colors, list built-in themes, or copy design/<theme>/DESIGN.md',
    run: async (ctx, args) => {
      const res = await window.axecoder.agentDesignSlash(ctx.projectRoot, args)
      if (!res.ok) return { ok: false, message: res.error ?? 'design command failed' }
      return { ok: true, message: res.message }
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
