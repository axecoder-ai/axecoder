import { registerBuiltinSlashCommands } from './builtin'
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
  const builtins = registerBuiltinSlashCommands()
  const reserved = reservedNames(builtins)
  let dynamic = [] as ReturnType<typeof buildSkillSlashCommands>

  const skillRes = await window.axecoder.agentListSkills(projectRoot)
  if (skillRes.ok && skillRes.skills.length) {
    dynamic = buildSkillSlashCommands(
      skillRes.skills,
      async (skillName) => {
        const loaded = await window.axecoder.agentLoadSkill(projectRoot, skillName)
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

  setSlashCommands([...builtins, ...dynamic])
  return { builtinCount: builtins.length, dynamicCount: dynamic.length }
}
