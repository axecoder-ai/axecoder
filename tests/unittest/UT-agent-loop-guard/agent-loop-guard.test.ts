import { describe, expect, it } from 'vitest'
import {
  applyStormBreaker,
  checkRepeatBeforeExecute,
  createLoopGuardState,
  isShellFileWriteCommand,
  recordRepeatSuccess,
  repeatSuccessSignature,
  resolveLoopGuardConfig,
} from '../../../electron/main/agent/agent-loop-guard'
import type { AgentToolCall } from '../../../electron/main/agent/agent-types'

const cfg = resolveLoopGuardConfig({})

describe('agent-loop-guard', () => {
  it('repeatSuccessSignature 识别 bash 写文件', () => {
    const sig = repeatSuccessSignature('Bash', {
      command: `python -c "with open('prompt.txt', 'w') as f: f.write('hello')"`,
    })
    expect(sig).toContain('Bash')
  })

  it('isShellFileWriteCommand 识别重定向', () => {
    expect(isShellFileWriteCommand('echo hi > out.txt')).toBe(true)
    expect(isShellFileWriteCommand('go test ./...')).toBe(false)
  })

  it('第 3 次相同写 bash 被 block', () => {
    const state = createLoopGuardState()
    const args = {
      command: `python -c "with open('prompt.txt', 'w') as f: f.write('hello')"`,
    }
    recordRepeatSuccess(state, 'Bash', args, true)
    recordRepeatSuccess(state, 'Bash', args, true)
    const block = checkRepeatBeforeExecute(state, cfg, 'Bash', args)
    expect(block).toContain('[loop guard]')
  })

  it('storm breaker 第 3 次同错注入指引', () => {
    const state = createLoopGuardState()
    const calls: AgentToolCall[] = [
      { id: '1', name: 'Read', arguments: { file_path: 'x' } },
    ]
    const fail = () => ({
      toolName: 'Read',
      args: { file_path: 'x' },
      content: 'Error: missing file',
      ok: false,
    })

    applyStormBreaker(state, cfg, calls, [fail()])
    applyStormBreaker(state, cfg, calls, [fail()])
    const third = applyStormBreaker(state, cfg, calls, [fail()])
    expect(third.contents[0]).toContain('[loop guard]')
    expect(third.notice).toContain('loop guard')
  })

  it('guard 可关闭', () => {
    const off = resolveLoopGuardConfig({ agentLoopGuardEnabled: false })
    const state = createLoopGuardState()
    const args = { file_path: 'a.txt', content: 'x' }
    recordRepeatSuccess(state, 'Write', args, true)
    recordRepeatSuccess(state, 'Write', args, true)
    expect(checkRepeatBeforeExecute(state, off, 'Write', args)).toBeNull()
  })
})
