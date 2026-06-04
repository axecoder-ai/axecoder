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
  normalizeWorkshopMessages,
} from '../../../electron/main/workshop/workshop-store'
import {
  projectWorkshopFilePath,
  projectSessionsIndexPath,
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

    const indexRaw = await fs.readFile(projectSessionsIndexPath(projectRoot), 'utf-8')
    const index = JSON.parse(indexRaw) as { id: string; kind: string }[]
    expect(index).toHaveLength(1)
    expect(index[0].kind).toBe('workshop')

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

  it('normalizeWorkshopMessages 合并 legacy reasoning 条', () => {
    const merged = normalizeWorkshopMessages([
      { id: '1', roleId: 'manager', text: '思考', kind: 'reasoning', createdAt: 1 },
      { id: '2', roleId: 'manager', text: '结论', createdAt: 2 },
    ])
    expect(merged).toHaveLength(1)
    expect(merged[0].text).toBe('结论')
    expect(merged[0].reasoningContent).toBe('思考')
  })

  it('getWorkshopSession 读取时自动 normalize', async () => {
    const session = newWorkshopSession(projectRoot, '任务', 'm1')
    session.messages = [
      { id: '1', roleId: 'manager', text: '想', kind: 'reasoning', createdAt: 1 },
      { id: '2', roleId: 'manager', text: '答', createdAt: 2 },
    ]
    await saveWorkshopSession(projectRoot, session)
    const got = await getWorkshopSession(projectRoot, session.id)
    expect(got.session?.messages).toHaveLength(1)
    expect(got.session?.messages[0].reasoningContent).toBe('想')
  })

  it('并发 saveWorkshopSession 不触发 rename ENOENT', async () => {
    const session = newWorkshopSession(projectRoot, '并发', 'm1')
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) => {
        const s = { ...session, updatedAt: Date.now() + i }
        return saveWorkshopSession(projectRoot, s)
      }),
    )
    expect(results.every((r) => r.ok)).toBe(true)
    const got = await getWorkshopSession(projectRoot, session.id)
    expect(got.session?.userBrief).toBe('并发')
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
