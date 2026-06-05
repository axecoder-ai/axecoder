import { describe, expect, it, vi, beforeEach } from 'vitest'
import type { UserEntry } from '../../../src/types/axecoder'
import {
  ROLE_MENTION_SINGLE_ERROR,
  loadWorkflowSlugPrompt,
  prepareRoleWorkflowSendPlan,
  validateRoleMentionText,
} from '../../../src/utils/role-workflow-send'

const lois: UserEntry = {
  id: 'builtin-researcher',
  displayName: 'Lois Lane',
  role: 'Researcher',
  expertise: '',
  avatarPath: '',
  isBuiltin: true,
  builtinRole: 'researcher',
  skillSlugs: ['research-codebase'],
}

describe('role-workflow-send', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {
      axecoder: {
        agentLoadSkill: vi.fn(async () => ({ ok: false, error: 'missing' })),
        agentLoadCustomCommand: vi.fn(async () => ({ ok: false, error: 'missing' })),
        agentLoadBuiltinCommand: vi.fn(async () => ({
          ok: true,
          text: 'PLAYBOOK',
          name: 'research-codebase',
          path: '/x',
        })),
        agentLoadBuiltinSkill: vi.fn(async () => ({ ok: false, error: 'missing' })),
      },
    })
  })

  it('validateRoleMentionText 单 @ 规则', () => {
    const bob: UserEntry = {
      id: 'b',
      displayName: 'Bob',
      role: 'Developer',
      expertise: '',
      avatarPath: '',
    }
    expect(validateRoleMentionText('@Lois Lane 调研', [lois])).toEqual({ ok: true })
    expect(validateRoleMentionText('@Lois Lane @Bob 任务', [lois, bob])).toEqual({
      ok: false,
      error: ROLE_MENTION_SINGLE_ERROR,
    })
  })

  it('loadWorkflowSlugPrompt 按优先级加载', async () => {
    const ax = window.axecoder
    await expect(loadWorkflowSlugPrompt('/proj', 'research-codebase')).resolves.toEqual({
      ok: true,
      text: 'PLAYBOOK',
    })
    expect(ax.agentLoadBuiltinCommand).toHaveBeenCalledWith('research-codebase')

    vi.mocked(ax.agentLoadSkill).mockResolvedValueOnce({
      ok: true,
      text: 'SKILL BODY',
      name: 'my-skill',
      path: '/s',
    })
    await expect(loadWorkflowSlugPrompt('/proj', 'my-skill')).resolves.toEqual({
      ok: true,
      text: 'SKILL BODY',
    })
    expect(ax.agentLoadSkill).toHaveBeenCalledWith('/proj', 'my-skill')
  })

  it('prepareRoleWorkflowSendPlan @ 角色加载 playbook', async () => {
    const plan = await prepareRoleWorkflowSendPlan(
      '@Lois·Lane 写到 research/',
      [lois],
      '/proj',
    )
    expect(plan).toMatchObject({
      kind: 'workflow',
      slug: 'research-codebase',
      userId: 'builtin-researcher',
    })
    if (plan.kind === 'workflow') {
      expect(plan.prompt).toContain('PLAYBOOK')
      expect(plan.prompt).toContain('写到 research/')
    }
  })
})
