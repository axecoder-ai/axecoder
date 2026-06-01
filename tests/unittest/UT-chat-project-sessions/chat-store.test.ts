import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import {
  listChatSessions,
  getChatSession,
  saveChatSession,
  deleteChatSession,
} from '../../../electron/main/chat-store'
import {
  projectSessionsDir,
  projectSessionFilePath,
  projectSessionsIndexPath,
} from '../../../electron/main/project-axecoder-dir'

let projectA = ''
let projectB = ''

beforeEach(async () => {
  projectA = await fs.mkdtemp(path.join(os.tmpdir(), 'wc-chat-a-'))
  projectB = await fs.mkdtemp(path.join(os.tmpdir(), 'wc-chat-b-'))
})

afterEach(async () => {
  await fs.rm(projectA, { recursive: true, force: true })
  await fs.rm(projectB, { recursive: true, force: true })
})

describe('chat-store project sessions', () => {
  it('空 projectRoot 返回空列表', async () => {
    const res = await listChatSessions('')
    expect(res.sessions).toEqual([])
  })

  it('非法 projectRoot 拒绝保存', async () => {
    const res = await saveChatSession('/no/such/project-root-xyz', {
      id: 'chat-1',
      title: 't',
      updatedAt: 1,
      messages: [],
    })
    expect(res.ok).toBe(false)
  })

  it('保存会话写入 index 与单文件', async () => {
    const session = {
      id: 'chat-abc',
      title: '你好',
      updatedAt: 1000,
      messages: [{ role: 'user' as const, text: 'hi' }],
    }
    const saved = await saveChatSession(projectA, session)
    expect(saved.ok).toBe(true)

    const indexRaw = await fs.readFile(projectSessionsIndexPath(projectA), 'utf-8')
    const index = JSON.parse(indexRaw) as { id: string; title: string }[]
    expect(index).toHaveLength(1)
    expect(index[0].id).toBe('chat-abc')

    const fileRaw = await fs.readFile(projectSessionFilePath(projectA, 'chat-abc'), 'utf-8')
    const file = JSON.parse(fileRaw) as { messages: { text: string }[] }
    expect(file.messages[0].text).toBe('hi')
  })

  it('列表接口不加载 messages', async () => {
    await saveChatSession(projectA, {
      id: 'chat-big',
      title: '大会话',
      updatedAt: 2,
      messages: [{ role: 'assistant', text: 'x'.repeat(5000) }],
    })
    const list = await listChatSessions(projectA)
    expect(list.sessions[0].title).toBe('大会话')
    expect(list.sessions[0]).not.toHaveProperty('messages')
  })

  it('getChatSession 读取完整会话', async () => {
    await saveChatSession(projectA, {
      id: 'chat-get',
      title: '读',
      updatedAt: 3,
      messages: [{ role: 'user', text: 'q' }],
    })
    const res = await getChatSession(projectA, 'chat-get')
    expect(res.session?.messages[0].text).toBe('q')
  })

  it('deleteChatSession 移除 index 与文件', async () => {
    await saveChatSession(projectA, {
      id: 'chat-del',
      title: '删',
      updatedAt: 4,
      messages: [],
    })
    const del = await deleteChatSession(projectA, 'chat-del')
    expect(del.ok).toBe(true)
    const list = await listChatSessions(projectA)
    expect(list.sessions).toHaveLength(0)
    await expect(fs.access(projectSessionFilePath(projectA, 'chat-del'))).rejects.toThrow()
  })

  it('两个项目会话互不影响', async () => {
    await saveChatSession(projectA, {
      id: 'chat-a',
      title: 'A',
      updatedAt: 1,
      messages: [],
    })
    await saveChatSession(projectB, {
      id: 'chat-b',
      title: 'B',
      updatedAt: 2,
      messages: [],
    })
    const listA = await listChatSessions(projectA)
    const listB = await listChatSessions(projectB)
    expect(listA.sessions.map((s) => s.id)).toEqual(['chat-a'])
    expect(listB.sessions.map((s) => s.id)).toEqual(['chat-b'])
    expect(await fs.stat(projectSessionsDir(projectA))).toBeTruthy()
    expect(await fs.stat(projectSessionsDir(projectB))).toBeTruthy()
  })
})
