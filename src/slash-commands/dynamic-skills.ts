import type { SlashCommandDef } from './types'

export type SkillSlashMeta = { name: string; path: string; source: string }

type SkillRunOutcome =
  | { ok: true; message: string; skillText?: string; skillName?: string }
  | { ok: false; message: string }

export const buildSkillSlashCommands = (
  skills: SkillSlashMeta[],
  runSkill: (skillName: string) => Promise<SkillRunOutcome>,
  reservedNames: Set<string>,
): SlashCommandDef[] => {
  const out: SlashCommandDef[] = []
  for (const s of skills) {
    const key = s.name.toLowerCase()
    if (reservedNames.has(key)) continue
    reservedNames.add(key)
    out.push({
      name: key,
      description: `Run skill: ${s.name}（${s.source}）`,
      run: async (ctx, args) => {
        const name = args.trim() || s.name
        const res = await runSkill(name)
        if (!res.ok) return { ok: false, message: res.message }
        if (res.skillText) {
          const session = ctx.getSession()
          if (session) {
            const invoke = `/${key}${args.trim() ? ` ${args.trim()}` : ''}`
            const body = `【Skill: ${res.skillName ?? name}】\n\n${res.skillText}\n\n---\nFollow the skill guidance above for the task.`
            session.messages.push({
              role: 'user',
              text: invoke,
              slashOnly: true,
              apiContent: body,
            })
            session.updatedAt = Date.now()
            ctx.setSession(session)
            await ctx.persist()
          }
        }
        return { ok: true, message: res.message }
      },
    })
  }
  return out
}
