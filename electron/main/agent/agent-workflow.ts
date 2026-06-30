import { loadBuiltinCommand } from './agent-builtin-commands'
import {
  findCustomCommandByName,
  readCustomCommandContent,
} from './agent-custom-commands'
import { findSkillByName, readSkillContent } from './agent-skills'

const appendUserNotes = (playbook: string, notes: string) => {
  const body = notes.trim()
  if (!body) return playbook
  return `${playbook}\n\n---\n\nUser notes:\n${body}`
}

export type WorkflowLoadResult =
  | { ok: true; name: string; source: string; text: string }
  | { ok: false; error: string }

/** 与 `src/utils/role-workflow-send.ts` loadWorkflowSlugPrompt 优先级一致 */
export const loadWorkflowPlaybook = async (
  projectRoot: string,
  rawName: string,
  userNotes = '',
): Promise<WorkflowLoadResult> => {
  const key = rawName.trim().toLowerCase()
  if (!key) return { ok: false, error: 'Workflow name is required' }

  const skill = await findSkillByName(projectRoot, key)
  if (skill) {
    const content = await readSkillContent(skill.path)
    if (content.ok && content.text.trim()) {
      return {
        ok: true,
        name: skill.name,
        source: `skill:${skill.source}`,
        text: appendUserNotes(content.text, userNotes),
      }
    }
  }

  const custom = await findCustomCommandByName(projectRoot, key)
  if (custom) {
    const content = await readCustomCommandContent(custom.path)
    if (content.ok && content.text.trim()) {
      return {
        ok: true,
        name: custom.name,
        source: `custom:${custom.source}`,
        text: appendUserNotes(content.text, userNotes),
      }
    }
    if (!content.ok) return { ok: false, error: content.error }
  }

  const builtin = await loadBuiltinCommand(key)
  if (builtin.ok) {
    return {
      ok: true,
      name: builtin.name,
      source: 'builtin-command',
      text: appendUserNotes(builtin.text, userNotes),
    }
  }

  return {
    ok: false,
    error: `Workflow not found: ${rawName}. Use DiscoverCommands or SlashCommand to list playbooks.`,
  }
}

export const runWorkflowTool = async (
  projectRoot: string,
  args: Record<string, unknown>,
): Promise<WorkflowLoadResult> => {
  const name = typeof args.name === 'string' ? args.name : ''
  const notes = typeof args.notes === 'string' ? args.notes : ''
  return loadWorkflowPlaybook(projectRoot, name, notes)
}
