import { listBuiltinCommands, loadBuiltinCommand } from './agent-builtin-commands'
import {
  discoverCustomCommands,
  findCustomCommandByName,
  readCustomCommandContent,
} from './agent-custom-commands'
import { discoverSkills, readSkillContent } from './agent-skills'

export type SlashCommandKind = 'playbook' | 'ui' | 'skill'

export type DiscoveredSlashCommand = {
  name: string
  description: string
  kind: SlashCommandKind
  source?: string
  path?: string
}

/** Renderer-only slash commands (ChatPane); Agent cannot execute side effects here. */
const UI_ONLY_COMMANDS: { name: string; description: string; aliases?: string[] }[] = [
  { name: 'model', description: 'Open model settings or switch activeModelId' },
  { name: 'compact', description: 'Compact session context (drop older messages)' },
  { name: 'permissions', description: 'Open Agent permissions settings' },
  { name: 'hooks', description: 'Show Agent hooks configuration help' },
  { name: 'mcp', description: 'List MCP servers from mcp.json' },
  { name: 'auto-plan', description: 'Toggle Agent auto-plan on/off (/auto-plan on | off)' },
  { name: 'effort', description: 'Set reasoning effort (auto | low | medium | high | max)' },
  { name: 'plan', description: 'Plan mode help (EnterPlanMode / ExitPlanMode)' },
  { name: 'skills', description: 'List skills under .cursor/skills' },
  { name: 'commit-push-pr', description: 'Commit, push, and create/update pull request', aliases: ['pr'] },
  { name: 'rewind', description: 'Rewind to Agent checkpoint or show Git status' },
  { name: 'resume', description: 'List in-memory active Agent sessions' },
  { name: 'export', description: 'Export current chat session as JSON' },
  { name: 'init', description: 'Create AGENTS.md template at project root' },
  { name: 'memory', description: 'View project memory (AGENTS.md + .axecoder/memory)' },
  { name: 'remember', description: 'Quick-save a note to project auto-memory' },
  { name: 'tree', description: 'Show conversation branches for this project' },
  { name: 'branch', description: 'Fork chat: /branch [turn] [name]' },
  { name: 'switch', description: 'Switch to another conversation branch by id or name' },
  { name: 'style', description: 'List or switch Agent output style', aliases: ['output-style'] },
  { name: 'help', description: 'List available slash commands (use DiscoverCommands from Agent)' },
  { name: 'clear', description: 'Clear current chat session messages' },
  { name: 'new', description: 'Start a new chat session' },
]

const appendUserNotes = (playbook: string, args: string) => {
  const body = args.trim()
  if (!body) return playbook
  return `${playbook}\n\n---\n\nUser notes:\n${body}`
}

export const discoverSlashCommands = async (
  projectRoot: string,
): Promise<DiscoveredSlashCommand[]> => {
  const byName = new Map<string, DiscoveredSlashCommand>()

  for (const c of await listBuiltinCommands()) {
    byName.set(c.name, {
      name: c.name,
      description: c.description,
      kind: 'playbook',
      source: 'builtin',
      path: c.path,
    })
  }

  for (const c of await discoverCustomCommands(projectRoot)) {
    byName.set(c.name, {
      name: c.name,
      description: c.description,
      kind: 'playbook',
      source: c.source,
      path: c.path,
    })
  }

  for (const u of UI_ONLY_COMMANDS) {
    if (!byName.has(u.name)) {
      byName.set(u.name, {
        name: u.name,
        description: u.description,
        kind: 'ui',
        source: 'renderer',
      })
    }
    for (const alias of u.aliases ?? []) {
      if (!byName.has(alias)) {
        byName.set(alias, {
          name: alias,
          description: u.description,
          kind: 'ui',
          source: 'renderer',
        })
      }
    }
  }

  for (const s of await discoverSkills(projectRoot)) {
    if (!byName.has(s.name)) {
      byName.set(s.name, {
        name: s.name,
        description: `Skill slash command (${s.source})`,
        kind: 'skill',
        source: s.source,
        path: s.path,
      })
    }
  }

  return [...byName.values()].sort((a, b) => a.name.localeCompare(b.name))
}

export const runSlashCommandForAgent = async (
  projectRoot: string,
  rawName: string,
  args: string,
) => {
  const name = rawName.replace(/^\//, '').trim().toLowerCase()
  if (!name) {
    return { ok: false as const, error: 'Command name is required' }
  }

  const builtin = await loadBuiltinCommand(name)
  if (builtin.ok) {
    return {
      ok: true as const,
      kind: 'playbook' as const,
      name: builtin.name,
      path: builtin.path,
      text: appendUserNotes(builtin.text, args),
    }
  }

  const custom = await findCustomCommandByName(projectRoot, name)
  if (custom) {
    const content = await readCustomCommandContent(custom.path)
    if (!content.ok) return { ok: false as const, error: content.error }
    return {
      ok: true as const,
      kind: 'playbook' as const,
      name: custom.name,
      path: custom.path,
      text: appendUserNotes(content.text, args),
    }
  }

  const ui = UI_ONLY_COMMANDS.find((u) => u.name === name || (u.aliases ?? []).includes(name))
  if (ui) {
    return {
      ok: true as const,
      kind: 'ui' as const,
      name,
      text:
        `Slash command /${name} is UI-only (run in chat input). ` +
        `Use Agent tools directly when possible.\nDescription: ${ui.description}`,
    }
  }

  const skills = await discoverSkills(projectRoot)
  const skill = skills.find((s) => s.name.toLowerCase() === name) ?? null
  if (skill) {
    const content = await readSkillContent(skill.path)
    if (!content.ok) return { ok: false as const, error: content.error }
    return {
      ok: true as const,
      kind: 'skill' as const,
      name: skill.name,
      path: skill.path,
      text: content.text,
    }
  }

  return {
    ok: false as const,
    error: `Slash command not found: /${name}. Use DiscoverCommands to list available commands.`,
  }
}
