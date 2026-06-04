import { describe, expect, it } from 'vitest'
import {
  lastMemberContextFromMessages,
  priorSummaryFromMessages,
} from '../../../electron/main/workshop/workshop-api-messages'
import {
  formatMemberChatSummary,
  summarizeReportForChat,
} from '../../../electron/main/workshop/workshop-display'
import type { WorkshopMessage } from '../../../electron/main/workshop/workshop-types'

describe('workshop-context-parity', () => {
  it('formatMemberChatSummary 保留实质结论而非仅 Completed', () => {
    const report = 'Done.\n\nImplemented login handler in auth.ts and added tests.'
    const d = formatMemberChatSummary(report, ['src/auth.ts'])
    expect(d.summary).toContain('login handler')
    expect(d.summary).toContain('auth.ts')
    expect(d.summary).not.toBe('Completed this segment.')
  })

  it('priorSummaryFromMessages 合并 reasoningContent', () => {
    const messages: WorkshopMessage[] = [
      {
        id: '1',
        roleId: 'backend',
        text: 'Short bubble',
        reasoningContent: 'Detailed tool trace: read src/foo.ts and patched line 42.',
        createdAt: 1,
      },
    ]
    const prior = priorSummaryFromMessages(messages)
    expect(prior).toContain('Short bubble')
    expect(prior).toContain('Detailed tool trace')
  })

  it('lastMemberContextFromMessages 取最近成员全文', () => {
    const messages: WorkshopMessage[] = [
      { id: '1', roleId: 'manager', text: 'Assign backend', createdAt: 1 },
      {
        id: '2',
        roleId: 'backend',
        text: 'Fixed API',
        reasoningContent: 'Changed handler.ts',
        createdAt: 2,
      },
    ]
    const ctx = lastMemberContextFromMessages(messages)
    expect(ctx).toContain('Fixed API')
    expect(ctx).toContain('handler.ts')
  })

  it('summarizeReportForChat 截断过长文本', () => {
    const long = 'x'.repeat(2000)
    expect(summarizeReportForChat(long, 100).length).toBeLessThanOrEqual(101)
  })
})
