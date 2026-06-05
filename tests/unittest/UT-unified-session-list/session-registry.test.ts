import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { saveChatSession } from '../../../electron/main/chat-store'
import { saveWorkshopSession } from '../../../electron/main/workshop/workshop-store'
import {
  listAllSessions,
  readRegistry,
} from '../../../electron/main/session/session-registry'
import { deleteWorkshopSession } from '../../../electron/main/workshop/workshop-store'
import {
  projectSessionsIndexPath,
  projectWorkshopsDir,
  projectWorkshopsIndexPath,
} from '../../../electron/main/project-axecoder-dir'

let projectRoot = ''

beforeEach(async () => {
  projectRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'wc-unified-'))
})

afterEach(async () => {
  await fs.rm(projectRoot, { recursive: true, force: true })
})

describe('session-registry', () => {
  it('迁移旧 workshops/index 并合并到 sessions/index', async () => {
    const workshopsDir = projectWorkshopsDir(projectRoot)
    await fs.mkdir(workshopsDir, { recursive: true })
    await fs.writeFile(
      projectWorkshopsIndexPath(projectRoot),
      JSON.stringify([{ id: 'ws-old', title: '旧协作', updatedAt: 500 }]),
    )
    await fs.writeFile(
      path.join(workshopsDir, 'ws-old.json'),
      JSON.stringify({
        id: 'ws-old',
        title: '旧协作',
        updatedAt: 500,
        userBrief: 'x',
        modelId: 'm1',
        messages: [],
        phase: 'idle',
        mountedFiles: [],
      }),
    )

    const all = await listAllSessions(projectRoot)
    expect(all.sessions.some((s) => s.id === 'ws-old' && s.kind === 'workshop')).toBe(true)
  })

  it('agent 与 workshop 共存于同一 index', async () => {
    await saveChatSession(projectRoot, {
      id: 'chat-1',
      title: '对话',
      updatedAt: 100,
      messages: [],
    })
    await saveWorkshopSession(projectRoot, {
      id: 'ws-1',
      title: '协作',
      updatedAt: 200,
      userBrief: '任务',
      modelId: 'm1',
      messages: [],
      phase: 'idle',
      mountedFiles: [],
    })

    const raw = JSON.parse(await fs.readFile(projectSessionsIndexPath(projectRoot), 'utf-8')) as {
      id: string
      kind: string
    }[]
    expect(raw).toHaveLength(2)
    expect(raw.find((e) => e.id === 'chat-1')?.kind).toBe('agent')
    expect(raw.find((e) => e.id === 'ws-1')?.kind).toBe('workshop')

    const all = await listAllSessions(projectRoot)
    expect(all.sessions.map((s) => s.id).sort()).toEqual(['chat-1', 'ws-1'])
  })

  it('删除 workshop 后不会从旧 workshops/index 再次迁入', async () => {
    const workshopsDir = projectWorkshopsDir(projectRoot)
    await fs.mkdir(workshopsDir, { recursive: true })
    await fs.writeFile(
      projectWorkshopsIndexPath(projectRoot),
      JSON.stringify([{ id: 'ws-del', title: '待删协作', updatedAt: 600 }]),
    )
    await fs.writeFile(
      path.join(workshopsDir, 'ws-del.json'),
      JSON.stringify({
        id: 'ws-del',
        title: '待删协作',
        updatedAt: 600,
        userBrief: 'x',
        modelId: 'm1',
        messages: [],
        phase: 'idle',
        mountedFiles: [],
      }),
    )

    expect((await listAllSessions(projectRoot)).sessions.some((s) => s.id === 'ws-del')).toBe(true)
    await deleteWorkshopSession(projectRoot, 'ws-del')
    expect((await listAllSessions(projectRoot)).sessions.some((s) => s.id === 'ws-del')).toBe(false)
  })

  it('并发 save 不抛 ENOENT', async () => {
    const results = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        saveWorkshopSession(projectRoot, {
          id: `ws-${i}`,
          title: `W${i}`,
          updatedAt: 100 + i,
          userBrief: 't',
          modelId: 'm1',
          messages: [],
          phase: 'idle',
          mountedFiles: [],
        }),
      ),
    )
    expect(results.every((r) => r.ok)).toBe(true)
    await fs.access(projectSessionsIndexPath(projectRoot))
  })

  it('删除 agent 不影响 workshop 条目', async () => {
    await saveChatSession(projectRoot, {
      id: 'chat-x',
      title: 'A',
      updatedAt: 1,
      messages: [],
    })
    await saveWorkshopSession(projectRoot, {
      id: 'ws-x',
      title: 'W',
      updatedAt: 2,
      userBrief: 't',
      modelId: 'm1',
      messages: [],
      phase: 'idle',
      mountedFiles: [],
    })
    const { deleteChatSession } = await import('../../../electron/main/chat-store')
    await deleteChatSession(projectRoot, 'chat-x')
    const reg = await readRegistry(projectRoot)
    expect(reg.some((s) => s.id === 'ws-x' && s.kind === 'workshop')).toBe(true)
    expect(reg.some((s) => s.id === 'chat-x')).toBe(false)
  })
})
