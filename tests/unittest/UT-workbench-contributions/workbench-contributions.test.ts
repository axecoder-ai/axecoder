import { describe, expect, it } from 'vitest'
import { mergeContributions } from '../../../shared/workbench-contributions/merge'
import { resolveWorkbenchShellUrl } from '../../../src/utils/workbench-webview-url'

describe('mergeContributions', () => {
  it('merges views and commands without duplicate ids', () => {
    const a = {
      viewsContainers: { activitybar: [{ id: 'c1', title: 'C1' }] },
      views: {
        c1: [{ id: 'explorer', name: 'Explorer', type: 'webview' as const }],
      },
      commands: [{ command: 'a.cmd', title: 'A' }],
    }
    const b = {
      commands: [
        { command: 'a.cmd', title: 'A duplicate' },
        { command: 'b.cmd', title: 'B' },
      ],
      views: {
        c1: [{ id: 'search', name: 'Search', type: 'webview' as const }],
      },
    }
    const merged = mergeContributions(a, b)
    expect(merged.commands).toHaveLength(2)
    expect(merged.commands[0]?.command).toBe('a.cmd')
    expect(merged.views.c1).toHaveLength(2)
  })
})

describe('resolveWorkbenchShellUrl', () => {
  it('builds dev server url with hash route', () => {
    expect(resolveWorkbenchShellUrl('explorer', { devServerUrl: 'http://127.0.0.1:3344/' })).toBe(
      'http://127.0.0.1:3344/workbench-shell.html#/explorer',
    )
  })

  it('builds production relative url', () => {
    expect(resolveWorkbenchShellUrl('search', { basePath: './' })).toBe(
      './workbench-shell.html#/search',
    )
  })
})
