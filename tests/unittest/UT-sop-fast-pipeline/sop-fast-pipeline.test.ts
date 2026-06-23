import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { setAxecoderDirForTests } from '../../../electron/main/axecoder-dir'
import {
  BUILTIN_WORKFLOW_ROLES,
  seedBuiltinWorkflowUser,
} from '../../../electron/main/builtin-workflow-roles'
import { sendSopPipelineMessage } from '../../../electron/main/sop/sop-pipeline-engine'
import { newWorkshopSession } from '../../../electron/main/workshop/workshop-store'
import type { RoleSpeaker } from '../../../electron/main/workshop/workshop-types'

const users = BUILTIN_WORKFLOW_ROLES.map(seedBuiltinWorkflowUser)

describe('sendSopPipelineMessage fast (AXECODER_SOP_FAST=1)', () => {
  let testDir = ''
  let projectRoot = ''
  let prevFast: string | undefined

  beforeEach(async () => {
    prevFast = process.env.AXECODER_SOP_FAST
    process.env.AXECODER_SOP_FAST = '1'
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), 'sop-fast-'))
    projectRoot = path.join(testDir, 'proj')
    await fs.mkdir(projectRoot, { recursive: true })
    setAxecoderDirForTests(testDir)
    await fs.writeFile(
      path.join(testDir, 'users.json'),
      JSON.stringify({ schemaVersion: 1, users }),
      'utf-8',
    )
  })

  afterEach(() => {
    setAxecoderDirForTests(null)
    if (prevFast === undefined) delete process.env.AXECODER_SOP_FAST
    else process.env.AXECODER_SOP_FAST = prevFast
  })

  it('一行需求仅调用 speaker 一次即 done', async () => {
    const speaker = vi.fn<RoleSpeaker>(async (inp) => {
      expect(inp.sopAgentParity).toBe(true)
      expect(inp.reuseImplementSession).toBe(true)
      return {
        summary: '已实现 Todo，改动 src/todo.ts',
        relatedFiles: ['src/todo.ts'],
      }
    })

    const session = newWorkshopSession(projectRoot, '', 'm1')
    const res = await sendSopPipelineMessage(session, '实现 Todo 应用', speaker, undefined, {
      projectRoot,
    })
    expect(res.ok).toBe(true)
    if (!res.ok) return
    expect(speaker).toHaveBeenCalledTimes(1)
    expect(res.session.sopPhase).toBe('done')
    expect(res.session.phase).toBe('done')
    expect(res.session.sopPoolMessages?.some((m) => m.causeBy === 'WriteCode')).toBe(true)
  })
})
