import { describe, expect, it } from 'vitest'
import {
  buildGlobalPermissionsPolicy,
  resolveToolPermission,
} from '../../../electron/main/agent/agent-permissions'

describe('agent-permissions merge', () => {
  const baseCfg = {
    schemaVersion: 1 as const,
    autoSave: true,
    autoSaveDelay: 400,
    fontSize: 14,
    theme: 'vscode' as const,
    agentAutoApplyWrites: false,
    agentOutputStyle: 'default' as const,
  }

  it('legacy agentDisallowedTools 仍拒绝', () => {
    const cfg = { ...baseCfg, agentDisallowedTools: ['Bash'] }
    expect(resolveToolPermission(cfg, 'Bash')).toBe('deny')
  })

  it('deny 规则带 subject', () => {
    const cfg = {
      ...baseCfg,
      agentPermissionDenyRules: ['Bash(rm -rf*)'],
    }
    const policy = buildGlobalPermissionsPolicy(cfg)
    expect(
      resolveToolPermission(cfg, 'Bash', {
        subject: 'rm -rf /',
        mergedPolicy: policy,
      }),
    ).toBe('deny')
    expect(
      resolveToolPermission(cfg, 'Bash', {
        subject: 'ls',
        mergedPolicy: policy,
      }),
    ).toBe('ask')
  })
})
