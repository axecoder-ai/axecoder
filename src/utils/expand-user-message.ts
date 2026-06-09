import type { UserEntry } from '../types/axecoder'
import { roleMentionSkipTokens } from './at-ref-picker'

/** 发前展开：附件文件 + 行内 @ 引用（跳过 @角色名） */
export const expandUserMessageForApi = async (
  projectRoot: string,
  text: string,
  filePaths?: string[],
  mentionUsers?: UserEntry[],
): Promise<string> => {
  let content = text
  if (filePaths?.length) {
    content = await window.axecoder.expandChatUserWithFiles(projectRoot, content, filePaths)
  }
  if (content.includes('@')) {
    const skip = mentionUsers?.length ? roleMentionSkipTokens(content, mentionUsers) : []
    const res = await window.axecoder.expandChatAtRefs(projectRoot, content, skip)
    if (res.ok) content = res.text
  }
  return content
}
