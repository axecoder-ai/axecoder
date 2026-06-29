import type {
  CommandContribution,
  ManifestContributes,
  ThemeContribution,
  ViewContainerContribution,
  ViewContribution,
  WorkbenchContributions,
} from './types'

const mergeViewContainers = (
  base: Record<string, ViewContainerContribution[]>,
  extra: Record<string, ViewContainerContribution[]> | undefined,
): Record<string, ViewContainerContribution[]> => {
  const out = { ...base }
  if (!extra) return out
  for (const [loc, list] of Object.entries(extra)) {
    const prev = out[loc] ?? []
    const ids = new Set(prev.map((x) => x.id))
    out[loc] = [...prev, ...list.filter((x) => !ids.has(x.id))]
  }
  return out
}

const mergeViews = (
  base: Record<string, ViewContribution[]>,
  extra: Record<string, ViewContribution[]> | undefined,
): Record<string, ViewContribution[]> => {
  const out = { ...base }
  if (!extra) return out
  for (const [containerId, list] of Object.entries(extra)) {
    const prev = out[containerId] ?? []
    const ids = new Set(prev.map((x) => x.id))
    out[containerId] = [...prev, ...list.filter((x) => !ids.has(x.id))]
  }
  return out
}

const mergeCommands = (
  base: CommandContribution[],
  extra: CommandContribution[] | undefined,
): CommandContribution[] => {
  const out = [...base]
  const ids = new Set(base.map((c) => c.command))
  if (!extra) return out
  for (const c of extra) {
    if (ids.has(c.command)) continue
    ids.add(c.command)
    out.push(c)
  }
  return out
}

const mergeThemes = (
  base: ThemeContribution[],
  extra: ThemeContribution[] | undefined,
): ThemeContribution[] => {
  const out = [...base]
  const ids = new Set(base.map((t) => t.id))
  if (!extra) return out
  for (const t of extra) {
    if (ids.has(t.id)) continue
    ids.add(t.id)
    out.push(t)
  }
  return out
}

/** 合并多份 manifest contributes；先出现的条目优先（不覆盖） */
export const mergeContributions = (
  ...manifests: ManifestContributes[]
): WorkbenchContributions => {
  let viewsContainers: Record<string, ViewContainerContribution[]> = {}
  let views: Record<string, ViewContribution[]> = {}
  let commands: CommandContribution[] = []
  let themes: ThemeContribution[] = []

  for (const m of manifests) {
    viewsContainers = mergeViewContainers(viewsContainers, m.viewsContainers)
    views = mergeViews(views, m.views)
    commands = mergeCommands(commands, m.commands)
    themes = mergeThemes(themes, m.themes)
  }

  return { viewsContainers, views, commands, themes }
}
