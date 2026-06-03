import { discoverCustomCommands, readCustomCommandContent } from '../agent/agent-custom-commands'
import { loadBuiltinCommand } from '../agent/agent-builtin-commands'
import { discoverSkills, readSkillContent } from '../agent/agent-skills'
import type { UserEntry } from '../users-types'
import type { RoleSpeakInput } from './workshop-types'

export const resolveUserSkillPromptBlock = async (
  user: UserEntry,
  projectRoot: string,
): Promise<string> => {
  const slugs = (user.skillSlugs ?? []).map((s) => s.trim().toLowerCase()).filter(Boolean)
  if (!slugs.length) return ''
  const root = projectRoot.trim()
  const parts: string[] = []
  for (const slug of slugs) {
    let text = ''
    const skills = await discoverSkills(root)
    const skill = skills.find((s) => s.name.toLowerCase() === slug)
    if (skill) {
      const res = await readSkillContent(skill.path)
      if (res.ok) text = res.text.trim()
    }
    if (!text) {
      const builtinCmd = await loadBuiltinCommand(slug)
      if (builtinCmd.ok) text = builtinCmd.text.trim()
    }
    if (!text) {
      const commands = root ? await discoverCustomCommands(root) : await discoverCustomCommands('')
      const cmd = commands.find((c) => c.name.toLowerCase() === slug)
      if (cmd) {
        const res = await readCustomCommandContent(cmd.path)
        if (res.ok) text = res.text.trim()
      }
    }
    if (!text) continue
    parts.push(`### ${slug}\n${text}`)
  }
  if (!parts.length) return ''
  return ['【绑定 Skill / 命令】', '以下为本用户绑定的能力指引，请优先遵循：', '', ...parts].join('\n')
}

export const enrichRoleSpeakInputWithSkills = async (
  input: RoleSpeakInput,
  projectRoot: string,
): Promise<RoleSpeakInput> => {
  if (!input.assigneeUser || (input.speakMode !== 'member' && input.speakMode !== 'execute')) {
    return input
  }
  const skillPromptBlock = await resolveUserSkillPromptBlock(input.assigneeUser, projectRoot)
  if (!skillPromptBlock) return input
  return { ...input, skillPromptBlock }
}
