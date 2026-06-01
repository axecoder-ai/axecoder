import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {
  listWorkshopSessions,
  getWorkshopSession,
  saveWorkshopSession,
  deleteWorkshopSession,
  newWorkshopSession,
} from '../../../electron/main/workshop/workshop-store'
import {
  projectWorkshopsDir,
  projectWorkshopFilePath,
  projectWorkshopsIndexPath,
} from '../../../electron/main/project-axecoder-dir'

let projectRoot = ''

beforeEach(async () => {
  projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'wc-ws-'))
})

afterEach(async () => {
  await fs.rm(projectRoot, { recursive: true, force: true })
})

describe('workshop-store', () => {
  it('空 projectRoot 返回空列表', async () => {
    const res = await listWorkshopSessions('')
    expect(res.sessions).toEqual([])
  })

  it('保存 workshop 写入 index 与单文件', async () => {
    const session = newWorkshopSession(projectRoot, '实现登录功能', 'model-1')
    session.messages.push({
      id: 'm1',
      roleId: 'user',
      text: '实现登录功能',
      createdAt: 1,
    })
    const saved = await saveWorkshopSession(projectRoot, session)
    expect(saved.ok).toBe(true)

    const indexRaw = await fs.readFile(projectWorkshopsIndexPath(projectRoot), 'utf-8')
    const index = JSON.parse(indexRaw) as { id: string }[]
    expect(index).toHaveLength(1)

    const fileRaw = await fs.readFile(
      projectWorkshopFilePath(projectRoot, session.id),
      'utf-8',
    )
    const file = JSON.parse(fileRaw) as { userBrief: string }
    expect(file.userBrief).toBe('实现登录功能')
  })

  it('getWorkshopSession 读取完整会话', async () => {
    const session = newWorkshopSession(projectRoot, '任务', 'm1')
    await saveWorkshopSession(projectRoot, session)
    const got = await getWorkshopSession(projectRoot, session.id)
    expect(got.session?.id).toBe(session.id)
  })

  it('deleteWorkshopSession 删除文件', async () => {
    const session = newWorkshopSession(projectRoot, 'x', 'm1')
    await saveWorkshopSession(projectRoot, session)
    const del = await deleteWorkshopSession(projectRoot, session.id)
    expect(del.ok).toBe(true)
    const list = await listWorkshopSessions(projectRoot)
    expect(list.sessions).toHaveLength(0)
  })
})
