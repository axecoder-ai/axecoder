# 调研：AxeCoder 与 Claude Code 功能差距

- **日期：** 2026-06-01
- **范围：** 以本地 `claude-code` 快照与 `electron/main/agent/` 当前实现为准，对比系统提示、内置工具、斜杠命令、扩展机制
- **参考来源：**
  - `claude-code/docs/claude-code-system-prompts-full.md`
  - `docs/research/research-claude-code.md`
  - 代码：`electron/main/agent/`、`src/slash-commands/`、`src/components/workbench/ChatPane.vue`
  - 交付记录：`docs/deliverables/agent-*/` 各 `*-交付总结.md`

> **说明：** `claude-code` 为本地研究用快照（`.gitignore` 符号链接），非官方发行包。部分 Claude Code 能力受 feature flag / `USER_TYPE` 影响，对外构建可能不可见；本文「Claude Code 有」指快照/文档中的设计目标。

---

## 1. 已基本对齐

### 1.1 系统提示（Claude Code §2–§11 主体）

| 段落 | Claude Code | AxeCoder |
|------|-------------|----------|
| §2 开场 `getSimpleIntroSection` | ✓ | ✓（身份为 AxeCoder） |
| §3 `CYBER_RISK_INSTRUCTION` | ✓ | ✓ |
| §4 `getSimpleSystemSection` | ✓ | ✓ |
| §5 `getSimpleDoingTasksSection` | ✓（全员版） | ✓（不含 Ant 内部段） |
| §6 `getActionsSection` | ✓ | ✓ |
| §7 `getUsingYourToolsSection` 主段 | ✓ | ✓（不含 TodoWrite/Agent/Skills 子段） |
| §9 Tone and style | ✓（外部版） | ✓ |
| §10 Output efficiency | ✓（外部版） | ✓ |
| §11 动态：项目记忆 | `CLAUDE.md` / memdir | `AGENTS.md` + `CLAUDE.md`（`loadProjectMemoryPrompt`） |
| §11 动态：环境 / 语言 | ✓ | ✓（`computeSimpleEnvInfo`，无 Claude 产品/家族行） |
| §11 Output Style | Default / Explanatory / Learning | ✓（`agent-output-styles.ts` + 设置项） |
| §11 `SUMMARIZE_TOOL_RESULTS` | 常量段 | ✓（仅文本，无 FRC 运行时） |
| §13 默认子代理提示 | ✓ | ✓ + `Agent` 工具 + `runSubAgentTask` |

实现入口：`electron/main/agent/agent-system-prompt.ts`、`agent-tool-prompts.ts`。

### 1.2 Agent 内置工具（改仓库主路径）

| 工具 | AxeCoder |
|------|----------|
| Read / Edit / Write | ✓（Edit/Write 需用户确认 diff） |
| Glob / Grep | ✓ |
| Delete / Move | ✓ |
| AskUserQuestion | ✓ |
| Bash | ✓（简化：超时、输出截断、需批准；无后台/沙箱完整规则） |
| Agent | ✓（单一通用子代理，内联最多 6 轮，子代理自动 apply，不可递归、不可 AskUserQuestion） |

主 Agent 工具表：`electron/main/agent/agent-tool-defs.ts` → `AGENT_TOOLS`。  
子代理工具：`SUB_AGENT_TOOLS`（排除 `Agent`、`AskUserQuestion`）。

### 1.3 产品形态（非缺口）

AxeCoder 为 **Electron 桌面 IDE**（活动栏、文件树、Monaco、聊天/Agents）。Claude Code 为终端 CLI / VS Code 扩展 / GitHub 集成。载体不同，不列为「未实现」。

---

## 2. 工具层缺口

对照 `claude-code` 快照 `getAllBaseTools()` / `docs/research/research-claude-code.md` §3。

| 类别 | Claude Code | AxeCoder |
|------|-------------|----------|
| 待办 | TodoWrite；Todo v2：TaskCreate/Get/Update/List | **无** |
| 联网 | WebFetch、WebSearch | **无** |
| Notebook | NotebookEdit | **无** |
| 计划模式 | EnterPlanMode、ExitPlanMode | **无** |
| Skill | Skill、DiscoverSkills | **无**（Agent 未读 `.cursor/skills`） |
| MCP | MCPTool、McpAuth、ListMcpResources、ReadMcpResource | **无** |
| 子代理 I/O | TaskOutput、TaskStop | **无** |
| 工具发现 | ToolSearch | **无** |
| 其它 | LSP、Worktree、Sleep、Brief、Config、Workflow 等 | **无** |
| Agent 类型 | Explore / Plan / General-purpose + 自定义 agents 目录 | **仅一种**内联子代理；无 `subagent_type`、无 fork/后台 |
| Bash | 长规则（后台、git、沙箱等，`BashTool/prompt.ts`） | **简化实现**（`agent-bash.ts`） |

---

## 3. 提示词已写、运行时未实现

系统提示或会话指引中**已出现**，但代码**未落地**：

| 能力 | 说明 |
|------|------|
| Hooks | §4 提到用户可配 hooks；无 `/hooks`、无工具前后 shell 执行 |
| 上下文自动压缩 | §4 称接近上限会自动压缩；**无** `/compact`、无摘要管线 |
| FRC（工具结果清理） | `SUMMARIZE_TOOL_RESULTS` 有；**无** 旧 tool result 清理运行时 |
| `! <command>` | §8 会话指引建议用户输入 `!` 跑命令；`ChatPane.send()` **未实现** |
| Permission mode | 提示有「用户所选 permission mode」；实际仅为写盘/Bash/问答 **逐条批准**，无 `allowedTools` / `disallowedTools` 规则引擎 |
| Scratchpad | Claude 会话隔离临时目录 | **无** |
| MCP instructions 动态段 | §11 `getMcpInstructions` | **无** |
| token_budget / brief | feature 段 | **无** |
| Proactive / Kairos | 自主 tick + Sleep | **无** |

---

## 4. 斜杠命令与扩展生态

| 项 | Claude Code | AxeCoder |
|----|-------------|----------|
| 斜杠命令数量 | 约 70+（`src/commands/`） | 框架已有，`src/slash-commands/registry.ts` **注册表为空** |
| `/help`、`/clear`、`/compact`、`/rewind`、`/mcp`、`/hooks`、`/plan`、`/skills` 等 | ✓ | **无**（输入 `/` 提示「暂无已注册斜杠命令」） |
| 插件 / Skill 动态命令 | ✓ | **无** |
| 自定义 output-styles 目录 | `~/.claude/output-styles/` 等 | **无**（仅内置三风格） |

提案（未实施）：`docs/proposals/proposal-slash-commands.md`。

---

## 5. 会话、执行与安全体验

| 项 | Claude Code | AxeCoder |
|----|-------------|----------|
| Checkpoint / `/rewind` | ✓ | **无**（依赖 Git / 编辑器历史） |
| `/resume`、`/export`、`/init`、`/memory` 等 | ✓ | **无** |
| 并行 tool call | 提示要求无依赖时并行 | 模型可返回多个 call，**循环内顺序执行**（`agent-loop.ts` `for (const tc of res.toolCalls)`） |
| 子代理 UI 进度 / TaskOutput | ✓ | **无** |
| Ollama Agent | — | **不支持**文件工具与子代理 |

---

## 6. 系统提示刻意未移植（合理）

以下为 Claude Code **Ant 内部**或产品专属段，AxeCoder 交付物中明确 **不做**：

- Verification Agent、加强版诚实汇报、Claude Code 产品 `/issue` 帮助
- `# Communicating with the user`（Ant 长版）、`numeric_length_anchors`
- §7 `getDiscoverSkillsGuidance`（无 DiscoverSkills 工具）
- 自定义 agents Markdown 目录、插件强制 Output Style

---

## 7. 建议实施顺序

若按投入产出排期：

1. **斜杠命令 V1**：`/help`、`/clear`、`/new`（`registry.ts` 注册 + `proposal-slash-commands.md` 提案 1）
2. **上下文压缩**：对齐 `/compact` 与 §4 承诺的自动压缩
3. **MCP**：Main 工具池 + 动态 `mcp_instructions` 段
4. **TodoWrite**：任务拆解与 UI
5. **Plan 模式**：Enter/ExitPlanMode
6. **子代理增强**：Explore/Plan 类型、并行执行 tool calls、可选后台 fork

---

## 8. 一句话结论

**改仓库主路径（读改搜 + 确认写盘 + Bash + 简单子代理 + 对齐版系统提示）已覆盖 Claude Code 核心；缺口主要在扩展层：MCP、Skills、Todo、联网、计划模式、斜杠命令生态、权限/压缩/回滚/Hooks，以及子代理类型与并行工具执行。**

---

## 9. 代码索引

| 路径 | 职责 |
|------|------|
| `electron/main/agent/agent-system-prompt.ts` | 系统提示组装 |
| `electron/main/agent/agent-tool-prompts.ts` | 工具 API description |
| `electron/main/agent/agent-loop.ts` | 多轮 Agent 循环、pending 批准 |
| `electron/main/agent/agent-subagent.ts` | 子代理内联循环 |
| `electron/main/agent/agent-bash.ts` | Bash 执行 |
| `src/slash-commands/registry.ts` | 斜杠命令注册（当前为空） |
| `claude-code/docs/claude-code-system-prompts-full.md` | Claude Code 提示词全集 |
| `docs/research/research-claude-code.md` | Claude Code 产品/工具调研 |

---

## 10. 修订记录

| 日期 | 说明 |
|------|------|
| 2026-06-01 | 初版：对照 agent 交付物与 `claude-code` 文档整理差距 |
