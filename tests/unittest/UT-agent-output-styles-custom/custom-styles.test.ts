import { describe, expect, it, afterEach } from 'vitest'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { loadCustomOutputStyles } from '../../../electron/main/agent/agent-output-styles-custom'

describe('loadCustomOutputStyles', () => {
  const styleDir = path.join(os.homedir(), '.axecoder', 'output-styles')
  const testFile = path.join(styleDir, 'vitest-my-style.md')

  afterEach(async () => {
    await fs.rm(testFile, { force: true }).catch(() => {})
  })

  it('从 ~/.axecoder/output-styles 加载 markdown 风格', async () => {
    await fs.mkdir(styleDir, { recursive: true })
    await fs.writeFile(
      testFile,
      `---
name: Vitest Style
description: Test custom
keepCodingInstructions: false
---
# Custom prompt body`,
      'utf-8',
    )
    const { styles, metas } = await loadCustomOutputStyles()
    expect(metas.some((m) => m.id === 'vitest-my-style')).toBe(true)
    expect(styles['vitest-my-style']?.prompt).toContain('Custom prompt')
    expect(styles['vitest-my-style']?.keepCodingInstructions).toBe(false)
  })
})
