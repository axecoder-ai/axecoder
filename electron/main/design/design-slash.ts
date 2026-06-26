import fs from 'node:fs/promises'
import path from 'node:path'

const appDesignRoot = () =>
  path.join(process.env.APP_ROOT ?? path.resolve(import.meta.dirname, '../../..'), 'design')

const projectDesignPath = (projectRoot: string) =>
  path.join(path.resolve(projectRoot.trim()), 'DESIGN.md')

const safeThemeName = (name: string): string | null => {
  const key = name.trim()
  if (!key || key.includes('..') || key.includes('/') || key.includes('\\')) return null
  if (!/^[a-zA-Z0-9._-]+$/.test(key)) return null
  return key
}

const pathExists = async (p: string) => {
  try {
    await fs.access(p)
    return true
  } catch {
    return false
  }
}

const listThemeDirs = async (root: string): Promise<string[]> => {
  let entries: string[]
  try {
    entries = await fs.readdir(root)
  } catch {
    return []
  }
  const names: string[] = []
  for (const name of entries) {
    if (name.startsWith('.')) continue
    const themeDir = path.join(root, name)
    try {
      const st = await fs.stat(themeDir)
      if (!st.isDirectory()) continue
      if (await pathExists(path.join(themeDir, 'DESIGN.md'))) names.push(name)
    } catch {
      /* skip */
    }
  }
  names.sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }))
  return names
}

const resolveThemeDir = async (root: string, themeName: string): Promise<string | null> => {
  const safe = safeThemeName(themeName)
  if (!safe) return null
  const direct = path.join(root, safe)
  if (await pathExists(path.join(direct, 'DESIGN.md'))) return direct
  const themes = await listThemeDirs(root)
  const hit = themes.find((t) => t.toLowerCase() === safe.toLowerCase())
  if (!hit) return null
  return path.join(root, hit)
}

export const listAppDesignThemes = async (): Promise<string[]> => listThemeDirs(appDesignRoot())

export const parseDesignColors = (raw: string): Record<string, string> => {
  const colors: Record<string, string> = {}
  let body = raw
  if (body.startsWith('---')) {
    const end = body.indexOf('---', 3)
    if (end > 0) body = body.slice(3, end)
  }
  const lines = body.split('\n')
  let inColors = false
  for (const line of lines) {
    if (/^colors:\s*$/.test(line.trim())) {
      inColors = true
      continue
    }
    if (!inColors) continue
    if (/^\S/.test(line) && !line.startsWith(' ')) break
    const m = line.match(/^\s{2}([a-zA-Z0-9_-]+):\s*["']?([^"'\n]+)["']?\s*$/)
    if (m) colors[m[1]] = m[2].trim()
  }
  return colors
}

const formatColorsBlock = (colors: Record<string, string>, max = 24): string => {
  const keys = Object.keys(colors)
  if (!keys.length) return '(DESIGN.md 中未解析到 colors 段)'
  const lines = keys.slice(0, max).map((k) => `- **${k}**: \`${colors[k]}\``)
  if (keys.length > max) lines.push(`- … 另有 ${keys.length - max} 项`)
  return lines.join('\n')
}

export const buildDesignMdAgentRule = async (projectRoot: string): Promise<string | null> => {
  const root = projectRoot.trim()
  if (!root) return null
  const filePath = projectDesignPath(root)
  if (!(await pathExists(filePath))) return null
  let raw = ''
  try {
    raw = await fs.readFile(filePath, 'utf-8')
  } catch {
    return null
  }
  const colors = parseDesignColors(raw)
  const colorBlock = formatColorsBlock(colors)
  return [
    '<always_applied_workspace_rules name="project-design-md">',
    '本项目根目录存在 `DESIGN.md`。开发前端 UI（`src/`、`web/` 等）时须遵照其中的配色、字体与组件风格；禁止随意引入与 DESIGN.md 冲突的色值或视觉语言。',
    '',
    '**配色摘要（完整规范见项目根 DESIGN.md）：**',
    colorBlock,
    '',
    '实现前先 Read `DESIGN.md`；用户可用 `/design` 查看配色，删除 `DESIGN.md` 可取消该约束。',
    '</always_applied_workspace_rules>',
  ].join('\n')
}

export const runDesignSlash = async (
  projectRoot: string,
  args: string,
): Promise<{ ok: true; message: string } | { ok: false; error: string }> => {
  const root = projectRoot.trim()
  if (!root) return { ok: false, error: '请先打开项目' }

  const designPath = projectDesignPath(root)
  const hasDesign = await pathExists(designPath)

  if (hasDesign) {
    let raw = ''
    try {
      raw = await fs.readFile(designPath, 'utf-8')
    } catch (e) {
      return { ok: false, error: e instanceof Error ? e.message : String(e) }
    }
    const colors = parseDesignColors(raw)
    const nameMatch = raw.match(/^name:\s*(.+)$/m)
    const designName = nameMatch ? nameMatch[1].trim() : 'DESIGN.md'
    const lines = [
      `当前项目已启用设计规范：**${designName}**（\`DESIGN.md\`）`,
      '',
      '**配色方案：**',
      formatColorsBlock(colors),
      '',
      '前端开发须遵照 `DESIGN.md` 中的样式风格。',
      '若要取消：删除项目根目录下的 `DESIGN.md` 即可。',
    ]
    return { ok: true, message: lines.join('\n') }
  }

  const themeArg = args.trim()
  const catalogRoot = appDesignRoot()

  if (!themeArg) {
    const themes = await listThemeDirs(catalogRoot)
    if (!themes.length) {
      return { ok: false, error: '内置设计库为空（未找到 design/*/DESIGN.md）' }
    }
    const lines = [
      '可选设计主题（应用内置 `design/` 库）：',
      '',
      ...themes.map((t) => `- \`${t}\` → 使用 \`/design ${t}\` 复制到项目根`),
      '',
      `共 ${themes.length} 个主题。`,
    ]
    return { ok: true, message: lines.join('\n') }
  }

  const themeDir = await resolveThemeDir(catalogRoot, themeArg)
  if (!themeDir) {
    const themes = await listThemeDirs(catalogRoot)
    const hint = themes.length ? `\n可用：${themes.slice(0, 12).join(', ')}${themes.length > 12 ? '…' : ''}` : ''
    return { ok: false, error: `未找到设计主题 "${themeArg}"${hint}` }
  }

  const src = path.join(themeDir, 'DESIGN.md')
  let content = ''
  try {
    content = await fs.readFile(src, 'utf-8')
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
  await fs.writeFile(designPath, content, 'utf-8')
  const themeName = path.basename(themeDir)
  const colors = parseDesignColors(content)
  const lines = [
    `已将 \`design/${themeName}/DESIGN.md\` 复制到项目根 \`DESIGN.md\`。`,
    '',
    '**配色预览：**',
    formatColorsBlock(colors, 12),
    '',
    'Agent 将按 DESIGN.md 约束前端样式。删除 `DESIGN.md` 可取消。',
  ]
  return { ok: true, message: lines.join('\n') }
}
