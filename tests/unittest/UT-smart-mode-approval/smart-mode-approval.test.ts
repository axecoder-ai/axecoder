import { describe, expect, it } from 'vitest'
import { parseSmartReviewResponse } from '../../../electron/main/agent/agent-smart-review-classifier'
import {
  formatSmartReviewBlockMessage,
  isSmartModeApprovalEnabled,
  shouldSmartReviewTool,
  summarizeSmartReviewTool,
} from '../../../electron/main/agent/agent-smart-review-params'
import { extractClassifierJson } from '../../../electron/main/agent/agent-auto-plan-classifier'

describe('smart-mode-approval', () => {
  it('parseSmartReviewResponse 解析 allow/block', () => {
    const raw = '{"action":"block","reason":"rm -rf is destructive"}'
    expect(parseSmartReviewResponse(raw)).toEqual({
      action: 'block',
      reason: 'rm -rf is destructive',
    })
    expect(parseSmartReviewResponse('{"action":"allow"}')).toEqual({
      action: 'allow',
      reason: '',
    })
    expect(extractClassifierJson(`ok\n${raw}`)).toContain('action')
  })

  it('formatSmartReviewBlockMessage 提示重试参数', () => {
    const msg = formatSmartReviewBlockMessage('risky')
    expect(msg).toContain('requestSmartModeApproval')
    expect(msg).toContain('smartModeBlockReason')
  })

  it('shouldSmartReviewTool 覆盖高风险工具，Bash 只读跳过', () => {
    expect(shouldSmartReviewTool('WebFetch', { url: 'https://example.com' })).toBe(true)
    expect(shouldSmartReviewTool('CallMcpTool', { server: 'x', toolName: 'y' })).toBe(true)
    expect(shouldSmartReviewTool('Delete', { file_path: 'a.txt' })).toBe(true)
    expect(shouldSmartReviewTool('Bash', { command: 'gh pr list' })).toBe(false)
    expect(shouldSmartReviewTool('Bash', { command: 'rm -rf /tmp/x' })).toBe(true)
    expect(shouldSmartReviewTool('Read', { path: 'a.ts' })).toBe(false)
  })

  it('isSmartModeApprovalEnabled 默认开、显式关', () => {
    expect(isSmartModeApprovalEnabled({})).toBe(true)
    expect(isSmartModeApprovalEnabled({ agentSmartModeApproval: true })).toBe(true)
    expect(isSmartModeApprovalEnabled({ agentSmartModeApproval: false })).toBe(false)
  })

  it('summarizeSmartReviewTool', () => {
    expect(summarizeSmartReviewTool('Bash', { command: 'npm test' })).toBe('npm test')
    expect(summarizeSmartReviewTool('WebFetch', { url: 'https://a.com' })).toBe('https://a.com')
  })
})
