## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 1:1 实现 Claude Code `getSimpleIntroSection` 结构并接入 Agent 系统提示组装；开场身份使用 AxeCoder 品牌。
- **调研来源：** `claude-code/docs/claude-code-system-prompts-full.md` §2–3；`electron/main/agent/agent-tool-defs.ts`
- **上游提案：** `docs/proposals/proposal-agent-simple-intro.md`（双方案草稿）
- **选定基础：** 提案 2 – 独立 `agent-system-prompt.ts` 模块化
- **用户调整摘要：**
  - 开场第一句身份改为 **AxeCoder**（非 Claude Code 原文 "You are an interactive agent..."）
  - 保留 `CYBER_RISK_INSTRUCTION` 与 URL 禁止编造规则（英文原文）
  - 无 Output Style 分支（固定 software engineering tasks）

### 最终方案 – Agent 系统提示模块化 + Intro 段

- **概述：** 新建 `electron/main/agent/agent-system-prompt.ts`，导出 `CYBER_RISK_INSTRUCTION`、`getSimpleIntroSection()`、`buildAgentSystemPrompt(projectRoot)`。Intro 段结构对齐 Claude Code §2；身份句为 AxeCoder。原工具使用规则从 intro 中拆出为 `AGENT_DOING_TASKS_SECTION`，避免与 intro 重复。`agent-tool-defs.ts` 保留 `AGENT_TOOLS` 并 re-export 组装函数。`agent-loop.ts` 继续从 `agent-tool-defs` 或改为直引新模块（推荐 re-export，调用方零改）。

- **相对选定提案的变更：** 身份句按用户要求品牌化为 AxeCoder，非文档英文逐字复制。

- **关键变更：**
  - 新增 `electron/main/agent/agent-system-prompt.ts`
  - 修改 `electron/main/agent/agent-tool-defs.ts`（移除内联 system 字符串，re-export）
  - 新增/扩展 `tests/unittest/UT-agent-system-prompt/agent-system-prompt.test.ts`
  - 更新 `tests/unittest/UT-agent-glob/agent-tool-defs.test.ts`（若仍测 prompt，改 import 路径）

- **权衡：** 多文件但职责清晰；品牌句与 Claude 原文略有差异，属用户确认范围。

- **验证：**
  - `npm test -- tests/unittest/UT-agent-system-prompt/ tests/unittest/UT-agent-glob/`
  - Agents 面板手测一条需 Glob/Read 的请求

- **待解决问题：** Output Style 变体、§4+ 其它 section 后续迭代。

### 未采纳方案说明

- **未选：** 提案 1 单文件最小拆分
- **原因：** 用户显式选择模块化方案以便后续扩展。
