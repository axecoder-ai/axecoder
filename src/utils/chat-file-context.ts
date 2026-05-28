/** 单文件、总上下文字符上限，避免撑爆模型上下文 */
export const CHAT_FILE_MAX_CHARS = 80_000
export const CHAT_FILES_TOTAL_MAX_CHARS = 200_000

export type ChatFileRef = {
  path: string
  name: string
}

export const fileNameFromPath = (p: string) => {
  const i = Math.max(p.lastIndexOf('/'), p.lastIndexOf('\\'))
  return i >= 0 ? p.slice(i + 1) : p
}

export const relativeToProject = (projectRoot: string, filePath: string) => {
  const root = projectRoot.replace(/\\/g, '/').replace(/\/$/, '')
  const p = filePath.replace(/\\/g, '/')
  if (p === root) return fileNameFromPath(filePath)
  if (p.startsWith(root + '/')) return p.slice(root.length + 1)
  return fileNameFromPath(filePath)
}

export const isUnderProject = (projectRoot: string, filePath: string) => {
  const root = projectRoot.replace(/\\/g, '/').replace(/\/$/, '')
  const p = filePath.replace(/\\/g, '/')
  return p === root || p.startsWith(root + '/')
}

const trimContent = (content: string, maxChars: number) => {
  if (content.length <= maxChars) return { text: content, truncated: false }
  return {
    text: content.slice(0, maxChars) + `\n\n…（已截断，原长 ${content.length} 字符）`,
    truncated: true,
  }
}

/** 把用户输入与项目文件内容拼成发给模型的 user 消息 */
export const buildUserMessageWithFiles = async (
  userText: string,
  filePaths: string[],
  projectRoot: string,
  readFile: (path: string) => Promise<{ content: string }>,
): Promise<string> => {
  if (!filePaths.length) return userText

  const blocks: string[] = []
  let totalChars = 0

  for (const filePath of filePaths) {
    if (!isUnderProject(projectRoot, filePath)) continue
    let raw = ''
    try {
      const res = await readFile(filePath)
      raw = res.content
    } catch {
      blocks.push(`### ${relativeToProject(projectRoot, filePath)}\n（读取失败）`)
      continue
    }

    const perFileBudget = Math.min(
      CHAT_FILE_MAX_CHARS,
      CHAT_FILES_TOTAL_MAX_CHARS - totalChars,
    )
    if (perFileBudget <= 0) {
      blocks.push(`### ${relativeToProject(projectRoot, filePath)}\n（已达总上下文上限，已跳过）`)
      continue
    }

    const { text, truncated } = trimContent(raw, perFileBudget)
    totalChars += text.length
    const label = relativeToProject(projectRoot, filePath)
    const note = truncated ? '（内容已截断）' : ''
    blocks.push(`### ${label}${note}\n\`\`\`\n${text}\n\`\`\``)
  }

  if (!blocks.length) return userText

  const filesSection = blocks.join('\n\n')
  return `${userText.trim()}\n\n---\n以下为项目文件内容，供你参考：\n\n${filesSection}`
}
