import { registerBuiltinSlashCommands } from './builtin'
import { buildCustomSlashCommands } from './dynamic-commands'
import { buildSkillSlashCommands } from './dynamic-skills'
import { setSlashCommands } from './registry-core'

const reservedNames = (builtins: ReturnType<typeof registerBuiltinSlashCommands>) => {
  const set = new Set<string>()
  for (const c of builtins) {
    set.add(c.name.toLowerCase())
    for (const a of c.aliases ?? []) set.add(a.toLowerCase())
  }
  return set
}

export const refreshSlashCommandRegistry = async (projectRoot: string) => {
  const root = projectRoot ?? ''
  const builtins = registerBuiltinSlashCommands()
  const reserved = reservedNames(builtins)
  let skillDynamic = [] as ReturnType<typeof buildSkillSlashCommands>
  let customDynamic = [] as ReturnType<typeof buildCustomSlashCommands>

  const skillRes = await window.axecoder.agentListSkills(root)
  if (skillRes.ok && skillRes.skills.length) {
    skillDynamic = buildSkillSlashCommands(
      skillRes.skills,
      async (skillName) => {
        const loaded = await window.axecoder.agentLoadSkill(root, skillName)
        if (!loaded.ok) return { ok: false, message: loaded.error ?? '加载失败' }
        return {
          ok: true,
          message: `已加载 Skill「${loaded.name}」。请在后续消息中说明任务；Skill 内容已记入会话。\n\n路径：${loaded.path}`,
          skillText: loaded.text,
          skillName: loaded.name,
        }
      },
      reserved,
    )
  }

  const customRes = await window.axecoder.agentListCustomCommands(root)
  if (customRes.ok && customRes.commands.length) {
    customDynamic = buildCustomSlashCommands(
      customRes.commands,
      async (commandName, args) => {
        const loaded = await window.axecoder.agentLoadCustomCommand(root, commandName)
        if (!loaded.ok) return { ok: false, message: loaded.error ?? '加载失败' }
        const userPart = args.trim()
        const sendPrompt = userPart
          ? `${loaded.text}\n\n---\n\n用户补充：\n${userPart}`
          : loaded.text
        return {
          ok: true,
          message: `已执行 /${loaded.name}`,
          sendPrompt,
        }
      },
      reserved,
    )
  }

  setSlashCommands([...builtins, ...skillDynamic, ...customDynamic])
  return {
    builtinCount: builtins.length,
    dynamicCount: skillDynamic.length + customDynamic.length,
    customCount: customDynamic.length,
  }
}
