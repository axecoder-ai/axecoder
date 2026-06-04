import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  getOutputStyleSection,
  OUTPUT_STYLE_CONFIG,
  resolveAgentOutputStyle,
} from '../../../electron/main/agent/agent-output-styles'
import { AGENT_TOOLS, SUB_AGENT_TOOLS } from '../../../electron/main/agent/agent-tool-defs'
import {
  CYBER_RISK_INSTRUCTION,
  DEFAULT_AGENT_PROMPT,
  SUMMARIZE_TOOL_RESULTS_SECTION,
  SYSTEM_PROMPT_DYNAMIC_BOUNDARY,
  buildAgentSystemPrompt,
  buildDefaultSubAgentSystemPrompt,
  computeSimpleEnvInfo,
  getDefaultAgentEnvNotesSection,
  getActionsSection,
  getAgentToolPathRulesSection,
  getLanguageSection,
  getOutputEfficiencySection,
  getSessionSpecificGuidanceSection,
  getSimpleToneAndStyleSection,
  getUsingYourToolsSection,
  getSimpleDoingTasksSection,
  getSimpleIntroSection,
  getSimpleSystemSection,
  loadProjectMemoryPrompt,
} from '../../../electron/main/agent/agent-system-prompt'

describe('agent-system-prompt getSimpleIntroSection', () => {
  it('开场身份为 AxeCoder 交互式工程助手', () => {
    const intro = getSimpleIntroSection()
    expect(intro).toMatch(/You are AxeCoder, an interactive agent/)
    expect(intro).toMatch(/software engineering tasks/)
    expect(intro).toMatch(/tools available to you/)
  })

  it('包含 CYBER_RISK_INSTRUCTION 与 URL 约束（Claude Code §2–3）', () => {
    const intro = getSimpleIntroSection()
    expect(intro).toContain(CYBER_RISK_INSTRUCTION)
    expect(intro).toMatch(/NEVER generate or guess URLs/)
    expect(intro).toMatch(/destructive techniques/)
  })

  it('有 Output Style 时 intro 引用 Output Style 分支', () => {
    const intro = getSimpleIntroSection(resolveAgentOutputStyle('Explanatory'))
    expect(intro).toMatch(/Output Style/)
    expect(intro).not.toMatch(/with software engineering tasks\./)
  })
})

describe('agent-output-styles', () => {
  it('default 为 null', () => {
    expect(OUTPUT_STYLE_CONFIG.default).toBeNull()
    expect(resolveAgentOutputStyle('default')).toBeNull()
  })

  it('Explanatory 含 Style Active 与 Insight 格式', () => {
    const cfg = resolveAgentOutputStyle('Explanatory')!
    expect(cfg.keepCodingInstructions).toBe(true)
    const section = getOutputStyleSection(cfg)!
    expect(section).toMatch(/# Output Style: Explanatory/)
    expect(section).toMatch(/# Explanatory Style Active/)
    expect(section).toMatch(/★ Insight/)
  })

  it('Learning 含 Learn by Doing 与 TODO\(human\)', () => {
    const cfg = resolveAgentOutputStyle('Learning')!
    const section = getOutputStyleSection(cfg)!
    expect(section).toMatch(/# Learning Style Active/)
    expect(section).toMatch(/Learn by Doing/)
    expect(section).toMatch(/TODO\(human\)/)
  })
})

describe('agent-system-prompt getSimpleSystemSection', () => {
  it('与 Claude Code §4 英文要点一致', () => {
    const system = getSimpleSystemSection()
    expect(system).toMatch(/Github-flavored markdown/)
    expect(system).toMatch(/do not re-attempt the exact same tool call/)
    expect(system).toMatch(/<system-reminder>/)
    expect(system).toMatch(/prompt injection/)
    expect(system).toMatch(/Hooks:/)
    expect(system).toMatch(/context limits/)
  })
})

describe('agent-system-prompt getSimpleDoingTasksSection', () => {
  it('与 Claude Code §5 全员英文要点一致', () => {
    const doing = getSimpleDoingTasksSection()
    expect(doing).toMatch(/methodName.*snake case/)
    expect(doing).toMatch(/find the method in the code/)
    expect(doing).toMatch(/AskUserQuestion/)
    expect(doing).toMatch(/OWASP top 10/)
    expect(doing).toMatch(/premature abstraction/)
    expect(doing).not.toMatch(/collaborator, not just an executor/) // Ant 内部
  })
})

describe('agent-system-prompt getActionsSection', () => {
  it('与 Claude Code §6 英文要点一致', () => {
    const actions = getActionsSection()
    expect(actions).toMatch(/reversibility and blast radius/)
    expect(actions).toMatch(/force-pushing/)
    expect(actions).toMatch(/merge conflicts/)
    expect(actions).toMatch(/CLAUDE\.md files/)
    expect(actions).toMatch(/third-party web tools/)
  })
})

describe('agent-system-prompt getUsingYourToolsSection', () => {
  it('与 Claude Code §7 主段要点一致', () => {
    const tools = getUsingYourToolsSection()
    expect(tools).toMatch(/Do NOT use Bash/)
    expect(tools).toMatch(/use `Read` instead of cat/)
    expect(tools).toMatch(/use `Glob` instead of find/)
    expect(tools).toMatch(/Call multiple tools in parallel/)
  })
})

describe('agent-system-prompt getSimpleToneAndStyleSection', () => {
  it('与 Claude Code §9 外部版要点一致', () => {
    const tone = getSimpleToneAndStyleSection()
    expect(tone).toMatch(/# Tone and style/)
    expect(tone).toMatch(/Only use emojis/)
    expect(tone).toMatch(/short and concise/)
    expect(tone).toMatch(/file_path:line_number/)
    expect(tone).toMatch(/owner\/repo#123/)
    expect(tone).toMatch(/Do not use a colon before tool calls/)
    expect(tone).toMatch(/Let me read the file\./)
  })
})

describe('agent-system-prompt getOutputEfficiencySection', () => {
  it('与 Claude Code §10 外部版要点一致', () => {
    const eff = getOutputEfficiencySection()
    expect(eff).toMatch(/# Output efficiency/)
    expect(eff).toMatch(/Go straight to the point/)
    expect(eff).toMatch(/Lead with the answer or action/)
    expect(eff).toMatch(/Decisions that need the user's input/)
    expect(eff).toMatch(/one sentence, don't use three/)
    expect(eff).toMatch(/does not apply to code or tool calls/)
    expect(eff).not.toMatch(/Communicating with the user/)
  })
})

describe('agent-system-prompt getSessionSpecificGuidanceSection', () => {
  it('与 Claude Code §8 要点一致（AskUserQuestion、! command）', () => {
    const section = getSessionSpecificGuidanceSection()
    expect(section).toMatch(/# Session-specific guidance/)
    expect(section).toMatch(/denied a tool call/)
    expect(section).toMatch(/`AskUserQuestion`/)
    expect(section).toMatch(/`! <command>`/)
    expect(section).toMatch(/gcloud auth login/)
  })

  it('无启用项时返回 null', () => {
    expect(
      getSessionSpecificGuidanceSection({ enabledToolNames: [], interactive: false }),
    ).toBeNull()
  })

  it('interactive: false 时不含 bang 提示', () => {
    const section = getSessionSpecificGuidanceSection({ interactive: false })
    expect(section).toMatch(/AskUserQuestion/)
    expect(section).not.toMatch(/`! <command>`/)
  })
})

describe('agent-system-prompt §11 dynamic sections', () => {
  it('SYSTEM_PROMPT_DYNAMIC_BOUNDARY 为组装标记', () => {
    expect(SYSTEM_PROMPT_DYNAMIC_BOUNDARY).toBe('__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__')
  })

  it('getLanguageSection 与 Claude §11 一致', () => {
    const lang = getLanguageSection('中文')
    expect(lang).toMatch(/# Language/)
    expect(lang).toMatch(/Always respond in 中文/)
  })

  it('SUMMARIZE_TOOL_RESULTS_SECTION 含 cleared later', () => {
    expect(SUMMARIZE_TOOL_RESULTS_SECTION).toMatch(/cleared later/)
  })

  it('computeSimpleEnvInfo 含工作目录与 model', async () => {
    const env = await computeSimpleEnvInfo('/tmp/proj', 'gpt-4o')
    expect(env).toMatch(/# Environment/)
    expect(env).toMatch(/Primary working directory/)
    expect(env).toMatch(/gpt-4o/)
  })

  it('loadProjectMemoryPrompt 读取 AGENTS.md', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'axecoder-mem-'))
    await fs.writeFile(path.join(dir, 'AGENTS.md'), 'Use TypeScript.', 'utf-8')
    const mem = await loadProjectMemoryPrompt(dir)
    expect(mem).toMatch(/# Project memory/)
    expect(mem).toMatch(/AGENTS\.md/)
    expect(mem).toMatch(/TypeScript/)
  })
})

describe('agent-system-prompt §13 default sub-agent', () => {
  it('DEFAULT_AGENT_PROMPT 身份为 AxeCoder', () => {
    expect(DEFAULT_AGENT_PROMPT).toMatch(/agent for AxeCoder/)
    expect(DEFAULT_AGENT_PROMPT).toMatch(/concise report/)
    expect(DEFAULT_AGENT_PROMPT).toMatch(/don't gold-plate/)
  })

  it('getDefaultAgentEnvNotesSection 含 §13 Notes 要点', () => {
    const notes = getDefaultAgentEnvNotesSection()
    expect(notes).toMatch(/absolute file paths/)
    expect(notes).toMatch(/load-bearing/)
    expect(notes).toMatch(/avoid using emojis/)
    expect(notes).toMatch(/Do not use a colon before tool calls/)
  })

  it('buildDefaultSubAgentSystemPrompt 含 prompt、notes、env、project root', async () => {
    const sub = await buildDefaultSubAgentSystemPrompt('/proj/sub', { modelId: 'gpt-4o' })
    expect(sub).toContain(DEFAULT_AGENT_PROMPT)
    expect(sub).toContain(getDefaultAgentEnvNotesSection())
    expect(sub).toMatch(/# Environment/)
    expect(sub).toMatch(/gpt-4o/)
    expect(sub).toMatch(/Project root/)
    expect(sub).not.toMatch(/You are AxeCoder, an interactive agent that helps users/)
  })

  it('SUB_AGENT_TOOLS 不含 Task/Agent 与 AskUserQuestion', () => {
    const names = SUB_AGENT_TOOLS.map((t) => t.name)
    expect(names).not.toContain('Task')
    expect(names).not.toContain('Agent')
    expect(names).not.toContain('AskUserQuestion')
    expect(AGENT_TOOLS.map((t) => t.name)).toContain('Task')
  })
})

describe('agent-system-prompt buildAgentSystemPrompt', () => {
  it('静态段后接动态段：session → env → language → summarize → tool rules → project root', async () => {
    const full = await buildAgentSystemPrompt('/proj/BIAOSHU', {
      skipProjectMemory: true,
      modelId: 'claude-sonnet',
      languagePreference: '中文',
    })
    expect(full).not.toContain(SYSTEM_PROMPT_DYNAMIC_BOUNDARY)
    const intro = getSimpleIntroSection()
    const system = getSimpleSystemSection()
    const doing = getSimpleDoingTasksSection()
    const actions = getActionsSection()
    const usingTools = getUsingYourToolsSection()
    const tone = getSimpleToneAndStyleSection()
    const outputEff = getOutputEfficiencySection()
    const sessionGuidance = getSessionSpecificGuidanceSection()
    const toolRules = getAgentToolPathRulesSection()
    const lang = getLanguageSection('中文')
    expect(full.indexOf(intro)).toBe(0)
    expect(full.indexOf(system)).toBeGreaterThan(full.indexOf(intro))
    expect(full.indexOf(doing)).toBeGreaterThan(full.indexOf(system))
    expect(full.indexOf(actions)).toBeGreaterThan(full.indexOf(doing))
    expect(full.indexOf(usingTools)).toBeGreaterThan(full.indexOf(actions))
    expect(full.indexOf(tone)).toBeGreaterThan(full.indexOf(usingTools))
    expect(full.indexOf(outputEff)).toBeGreaterThan(full.indexOf(tone))
    expect(sessionGuidance).not.toBeNull()
    expect(full.indexOf(sessionGuidance!)).toBeGreaterThan(full.indexOf(outputEff))
    expect(full.indexOf('# Environment')).toBeGreaterThan(full.indexOf(sessionGuidance!))
    expect(lang).not.toBeNull()
    expect(full.indexOf(lang!)).toBeGreaterThan(full.indexOf('# Environment'))
    expect(full.indexOf(SUMMARIZE_TOOL_RESULTS_SECTION)).toBeGreaterThan(full.indexOf(lang!))
    expect(full.indexOf(toolRules)).toBeGreaterThan(full.indexOf(SUMMARIZE_TOOL_RESULTS_SECTION))
    expect(full.indexOf('- Use Read before Edit')).toBeGreaterThan(full.indexOf(usingTools))
    expect(full).toMatch(/Glob/i)
    expect(full).toMatch(/Grep/i)
    expect(full).toMatch(/Project root/)
    expect(full).toMatch(/claude-sonnet/)
    expect(full).not.toMatch(/coding assistant with file tools/)
  })

  it('注入 projectMemory 时出现在 session guidance 之后', async () => {
    const full = await buildAgentSystemPrompt('/proj/X', {
      skipProjectMemory: true,
      projectMemory: '# Project memory\n\n## AGENTS.md\nfoo',
    })
    const sessionGuidance = getSessionSpecificGuidanceSection()
    expect(full.indexOf('# Project memory')).toBeGreaterThan(full.indexOf(sessionGuidance!))
    expect(full.indexOf('# Environment')).toBeGreaterThan(full.indexOf('# Project memory'))
  })

  it('Explanatory：output style 在 language 之后、summarize 之前', async () => {
    const full = await buildAgentSystemPrompt('/proj/BIAOSHU', {
      skipProjectMemory: true,
      outputStyleId: 'Explanatory',
    })
    const lang = getLanguageSection('中文')!
    expect(full).toMatch(/according to your "Output Style"/)
    expect(full).toMatch(/# Output Style: Explanatory/)
    expect(full.indexOf('# Output Style: Explanatory')).toBeGreaterThan(full.indexOf(lang))
    expect(full.indexOf(SUMMARIZE_TOOL_RESULTS_SECTION)).toBeGreaterThan(
      full.indexOf('# Output Style: Explanatory'),
    )
  })
})
