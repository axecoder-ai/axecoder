import { describe, expect, it, beforeEach, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import path from 'node:path'
import os from 'node:os'
import { setAxecoderDirForTests } from '../../../electron/main/axecoder-dir'
import { buildAgentRolePersonaAddon, applyAgentRolePersonaToMessages } from '../../../electron/main/agent/agent-role-persona'

let tmpDir = ''

beforeEach(async () => {
  tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'agent-role-'))
  setAxecoderDirForTests(tmpDir)
  await fs.writeFile(
    path.join(tmpDir, 'users.json'),
    JSON.stringify({
      schemaVersion: 1,
      users: [
        {
          id: 'builtin-developer',
          displayName: 'Developer',
          role: 'Developer',
          expertise: 'TDD',
          avatarPath: '',
          isBuiltin: true,
          builtinRole: 'developer',
          skillSlugs: ['implement'],
        },
        {
          id: 'custom-analyst',
          displayName: 'Alice',
          role: 'Product Analyst',
          expertise: '需求分析',
          avatarPath: '',
          skillSlugs: ['clarify'],
        },
      ],
    }),
    'utf-8',
  )
})

afterEach(async () => {
  setAxecoderDirForTests(null)
  await fs.rm(tmpDir, { recursive: true, force: true })
})

describe('buildAgentRolePersonaAddon', () => {
  it('注入角色名与 implement 命令指引', async () => {
    const { addon, user } = await buildAgentRolePersonaAddon('/tmp/p', 'builtin-developer')
    expect(user?.displayName).toBe('Developer')
    expect(addon).toContain('Agent role persona')
    expect(addon).toContain('implement')
  })

  it('roleWorkflowInvoke 时不重复注入 skill block', async () => {
    const { addon } = await buildAgentRolePersonaAddon('/tmp/p', 'builtin-developer', {
      roleWorkflowInvoke: true,
    })
    expect(addon).toContain('workflow playbook')
    expect(addon).not.toContain('### implement')
  })

  it('applyAgentRolePersona 内置角色不注入 persona', async () => {
    const messages = [{ role: 'system' as const, content: 'base' }]
    const speakerId = await applyAgentRolePersonaToMessages(
      '/tmp/p',
      'builtin-developer',
      messages,
      false,
    )
    expect(speakerId).toBe('builtin-developer')
    expect(messages[0]!.content).toBe('base')
  })

  it('applyAgentRolePersona 内置角色触发工作流也不注入 persona', async () => {
    const messages = [{ role: 'system' as const, content: 'base' }]
    await applyAgentRolePersonaToMessages('/tmp/p', 'builtin-developer', messages, true)
    expect(messages[0]!.content).toBe('base')
  })

  it('applyAgentRolePersona 自定义用户仍注入 persona', async () => {
    const messages = [{ role: 'system' as const, content: 'base' }]
    const speakerId = await applyAgentRolePersonaToMessages(
      '/tmp/p',
      'custom-analyst',
      messages,
      false,
    )
    expect(speakerId).toBe('custom-analyst')
    expect(messages[0]!.content).toContain('Agent role persona')
    expect(messages[0]!.content).toContain('Alice')
  })
})
