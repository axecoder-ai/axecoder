import { describe, expect, it } from 'vitest'
import {
  buildUserMessageWithFiles,
  fileNameFromPath,
  isUnderProject,
  relativeToProject,
} from '../../../src/utils/chat-file-context'

describe('chat-file-context', () => {
  it('相对路径与项目内判断', () => {
    const root = '/proj/BIAOSHU'
    expect(relativeToProject(root, '/proj/BIAOSHU/未来资料/参数.md')).toBe('未来资料/参数.md')
    expect(fileNameFromPath('/a/b/c.md')).toBe('c.md')
    expect(isUnderProject(root, '/proj/BIAOSHU/x.md')).toBe(true)
    expect(isUnderProject(root, '/other/x.md')).toBe(false)
  })

  it('拼接用户消息与文件内容', async () => {
    const out = await buildUserMessageWithFiles(
      '整理参数',
      ['/proj/BIAOSHU/参数.md'],
      '/proj/BIAOSHU',
      async () => ({ content: '参数1\n参数2' }),
    )
    expect(out).toContain('整理参数')
    expect(out).toContain('参数.md')
    expect(out).toContain('参数1')
  })
})
