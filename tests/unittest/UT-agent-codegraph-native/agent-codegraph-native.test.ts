import fs from 'node:fs'
import fsPromises from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { isCodeGraphAgentTool, executeCodeGraphAgentTool } from '../../../electron/main/agent/agent-codegraph'
import { getCodeGraphInstructionsSection } from '../../../electron/main/agent/agent-codegraph-prompt'
import { getSessionActiveTools } from '../../../electron/main/agent/agent-ext-executor'
import { buildFullAgentTools } from '../../../electron/main/agent/agent-tool-registry'
import { buildExtendedAgentTools } from '../../../electron/main/agent/agent-tool-prompts-ext'
import {
  closeCodeGraphSession,
  executeVendoredCodeGraphTool,
  isCodeGraphBackendAvailable,
} from '../../../electron/main/codegraph/manager'
import { getCodeGraphDistRoot } from '../../../electron/main/codegraph/bridge'

const distReady = fs.existsSync(path.join(getCodeGraphDistRoot(), 'index.js'))
const canRunIntegration = isCodeGraphBackendAvailable() && distReady

describe('agent-codegraph-native', () => {
  it('buildExtendedAgentTools 包含 CodeGraph 三工具', () => {
    const names = buildExtendedAgentTools().map((t) => t.name)
    expect(names).toContain('CodeGraphExplore')
    expect(names).toContain('CodeGraphSearch')
    expect(names).toContain('CodeGraphNode')
  })

  it('isCodeGraphAgentTool 识别 CodeGraph 工具名', () => {
    expect(isCodeGraphAgentTool('CodeGraphExplore')).toBe(true)
    expect(isCodeGraphAgentTool('Read')).toBe(false)
  })

  it('新会话默认向模型暴露 CodeGraph 三工具', () => {
    const names = getSessionActiveTools(buildFullAgentTools(), new Set()).map((t) => t.name)
    expect(names).toContain('CodeGraphExplore')
    expect(names).toContain('CodeGraphSearch')
    expect(names).toContain('CodeGraphNode')
  })

  it('getCodeGraphInstructionsSection 未索引时提示自动建索引', async () => {
    if (!isCodeGraphBackendAvailable()) return
    const tmp = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'axecg-prompt-'))
    try {
      const section = await getCodeGraphInstructionsSection(tmp)
      expect(section).toMatch(/not indexed|CodeGraph/i)
    } finally {
      await fsPromises.rm(tmp, { recursive: true, force: true })
    }
  })

  describe.skipIf(!canRunIntegration)('integration', () => {
    it('init + search 小 fixture', async () => {
      const tmp = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'axecg-int-'))
      await fsPromises.writeFile(
        path.join(tmp, 'sample.ts'),
        'export function greetUser() {\n  return "hi"\n}\n',
        'utf-8',
      )
      closeCodeGraphSession(tmp)
      try {
        const res = await executeCodeGraphAgentTool(tmp, 'CodeGraphSearch', {
          query: 'greetUser',
        })
        expect(res.ok).toBe(true)
        expect(res.text.toLowerCase()).toMatch(/greet/)
      } finally {
        closeCodeGraphSession(tmp)
        await fsPromises.rm(tmp, { recursive: true, force: true })
      }
    }, 180_000)

    it('CodeGraphExplore 返回源码片段', async () => {
      const tmp = await fsPromises.mkdtemp(path.join(os.tmpdir(), 'axecg-exp-'))
      await fsPromises.writeFile(
        path.join(tmp, 'lib.ts'),
        'export const MAGIC = 42\nexport function pickMagic() { return MAGIC }\n',
        'utf-8',
      )
      closeCodeGraphSession(tmp)
      try {
        const res = await executeVendoredCodeGraphTool(tmp, 'codegraph_explore', {
          query: 'pickMagic MAGIC',
        })
        expect(res.ok).toBe(true)
        expect(res.text).toMatch(/pickMagic|MAGIC/)
      } finally {
        closeCodeGraphSession(tmp)
        await fsPromises.rm(tmp, { recursive: true, force: true })
      }
    }, 180_000)
  })
})
