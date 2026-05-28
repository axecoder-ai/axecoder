# 调研：Claude Code 基本功能

- **日期：** 2026-05-28
- **范围：** Claude Code 产品定位、内置工具、斜杠命令、扩展机制、使用形态
- **参考来源：**
  - 本地源码快照：`claude-code` → `~/workspace/claude-code`（`.gitignore` 已忽略，仅供研究）
  - 快照内中文文档：`docs/src-tools-tutorial-zh.md`、`docs/claude-code-system-prompts-zh.md`
  - [Anthropic Claude Code](https://www.anthropic.com/product/claude-code)、[GitHub anthropics/claude-code](https://github.com/anthropics/claude-code)

> **说明：** 本地 `claude-code` 目录为 TypeScript 源码快照（README 标明仅供学习/研究），非官方发行包。下文功能描述以该快照 + 官方公开资料为准；部分能力受 feature flag / `USER_TYPE` / 订阅类型影响，对外构建可能不可见。

---

## 1. 产品定位

Claude Code 是 Anthropic 的**智能体编程系统**（Agentic Coding），运行在：

| 形态 | 说明 |
|------|------|
| **终端 CLI** | `claude` 交互会话；`claude -p "..."` 单次非交互输出 |
| **IDE 扩展** | VS Code 侧边栏，实时 diff、内联变更 |
| **GitHub 等** | PR/Issue 上 `@claude`（需安装 GitHub App 等集成） |

与「补全下一行」的 Copilot 类工具不同，Claude Code 在**项目级**工作：读全仓库、跨文件改代码、跑测试、处理 Git、按目标迭代直到完成或需人工决策。

---

## 2. 架构概览（源码快照）

```
src/main.tsx          # 主入口
src/QueryEngine.ts    # 查询引擎
src/tools.ts          # 内置工具总装配
src/tools/<Name>Tool/ # 各工具实现 + prompt.ts + UI
src/commands/         # 斜杠命令（约 101 个目录/模块）
src/commands.ts       # 命令注册与加载
src/skills/           # Skill 系统
src/coordinator/      # 多 Agent 协调
src/constants/prompts.ts  # 系统提示拼接
```

关键装配逻辑：

- **`getAllBaseTools()`**：当前环境可能出现的全部内置工具
- **`getTools(permissionContext)`**：经 deny 规则、`isEnabled()`、Simple/REPL 模式过滤后交给模型
- **`assembleToolPool()`**：内置 + MCP 合并，同名时内置优先

---

## 3. 内置工具（按职责）

下列与 `getAllBaseTools()` 对齐；**是否出现**仍受环境变量、feature、权限影响。

| 类别 | 工具/目录 | 功能 |
|------|-----------|------|
| **子代理** | `AgentTool/` | 委派子会话；内置 Explore / Plan / General-purpose 等（`built-in/*.ts`） |
| **Shell** | `BashTool/`、`PowerShellTool/` | 执行终端命令（模型被约束：非必要不用 Bash 替代专用文件工具） |
| **文件** | `FileReadTool/`、`FileEditTool/`、`FileWriteTool/`、`NotebookEditTool/` | 读、编辑、写入、Notebook |
| **搜索** | `GlobTool/`、`GrepTool/` | 路径/内容搜索（内嵌搜索可用时可能不单独注册） |
| **计划模式** | `EnterPlanModeTool/`、`ExitPlanModeTool/` | 先规划再实施 |
| **联网** | `WebFetchTool/`、`WebSearchTool/` | 抓取 URL、网页搜索 |
| **用户交互** | `AskUserQuestionTool/`、`BriefTool/` | 结构化提问、简报类交互 |
| **任务/待办** | `TodoWriteTool/`；Todo v2：`TaskCreate/Get/Update/List` | 拆解与跟踪任务 |
| **子代理 I/O** | `TaskOutputTool/`、`TaskStopTool/` | 读子代理输出、停止子代理 |
| **Skill** | `SkillTool/` | 调用用户/插件定义的 Skill |
| **MCP** | `MCPTool/`、`McpAuthTool/`、`ListMcpResourcesTool/`、`ReadMcpResourceTool/` | 外部 MCP 服务工具与资源 |
| **工具发现** | `ToolSearchTool/` | 在工具池过大时懒加载/搜索其它工具 |
| **IDE/语言** | `LSPTool/` | 语言服务（`ENABLE_LSP_TOOL`） |
| **Git worktree** | `EnterWorktreeTool/`、`ExitWorktreeTool/` | 隔离工作树内操作 |
| **其它** | `ConfigTool`、`WorkflowTool`、`ScheduleCronTool`、`SleepTool`、`SendMessageTool`、`TeamCreate/Delete` 等 | 按 feature / 用户类型加载 |

### 3.1 子代理与工具权限

- 内置代理定义：`AgentTool/builtInAgents.ts`、`built-in/*.ts`
- 自定义代理：配置目录 Markdown/JSON（`loadAgentsDir.ts`），可配 `tools` 白名单 / `disallowedTools`
- 全局限制：`src/constants/tools.ts` 中 `ALL_AGENT_DISALLOWED_TOOLS`、`ASYNC_AGENT_ALLOWED_TOOLS`、`COORDINATOR_MODE_ALLOWED_TOOLS`

默认子代理不能递归委派、不能控制主线程任务等；改能力需同时核对代理定义与运行时 `filterToolsForAgent`。

### 3.2 模型行为约束（系统提示要点）

摘自 `docs/claude-code-system-prompts-zh.md`：

| 原则 | 说明 |
|------|------|
| 专用工具优先 | 读文件用 Read，编辑用 Edit，搜索用 Glob/Grep；Bash 留给确需 shell 的场景 |
| 先读后改 | 未读过的代码一般不提议修改；用户点名文件应先读 |
| 少建新文件 | 优先编辑现有文件 |
| 谨慎破坏性操作 | 删文件、强推、改 CI、对外发消息等应先确认 |
| 并行无依赖工具 | 无数据依赖的 tool call 应并行 |
| 诚实 | 测试结果如实汇报；工具被拒后勿原样重试 |
| 范围克制 | 不超范围重构、不为极端边缘堆砌校验 |

---

## 4. 斜杠命令（内置）

`src/commands.ts` 中 `COMMANDS` 注册对外可见命令（约 70+）；另有 Skills、插件命令、Workflow 动态加载。`INTERNAL_ONLY_COMMANDS` 多为 Ant 内部构建专用。

### 4.1 会话与上下文

| 命令 | 作用 |
|------|------|
| `/clear` | 清空当前会话 |
| `/compact` | 压缩/摘要上下文 |
| `/resume` | 恢复历史会话 |
| `/session` | 会话管理 |
| `/export` | 导出会话 |
| `/context` | 查看上下文占用 |
| `/rewind` | 回滚到 checkpoint 前状态 |
| `/branch` | 从会话派生分支 |

### 4.2 项目与记忆

| 命令 | 作用 |
|------|------|
| `/init` | 扫描项目并生成 starter `CLAUDE.md` |
| `/add-dir` | 添加额外工作目录 |
| `/memory` | 管理持久记忆 |
| `/files` | 文件相关操作 |

### 4.3 配置与扩展

| 命令 | 作用 |
|------|------|
| `/config` | 配置菜单（模型、权限等） |
| `/model` | 切换模型 |
| `/permissions` | 工具权限 |
| `/hooks` | 生命周期 Hook 配置 |
| `/mcp` | MCP 服务器管理 |
| `/skills` | Skill 管理 |
| `/plugin` | 插件 |
| `/reload-plugins` | 重载插件 |

### 4.4 开发与审查

| 命令 | 作用 |
|------|------|
| `/plan` | 计划模式 |
| `/review`、`/ultrareview` | 代码审查 |
| `/diff` | 查看 diff |
| `/security-review` | 安全审查 |
| `/tasks` | 任务列表 |
| `/fast` | Fast 模式相关 |
| `/effort` | 推理 effort 设置 |

### 4.5 体验与诊断

| 命令 | 作用 |
|------|------|
| `/help` | 帮助 |
| `/doctor` | 环境诊断 |
| `/status` | 状态 |
| `/cost`、`/usage`、`/insights` | 用量与统计 |
| `/theme`、`/vim`、`/keybindings` | 主题、Vim、快捷键 |
| `/login`、`/logout` | 认证（非 3P 服务时） |
| `/upgrade` | 升级 |
| `/sandbox-toggle` | 沙箱开关 |

### 4.6 集成与其它（部分需 feature）

| 命令 | 作用 |
|------|------|
| `/ide` | IDE 集成 |
| `/chrome` | 浏览器相关 |
| `/install-github-app` | GitHub App |
| `/install-slack-app` | Slack |
| `/desktop`、`/mobile` | 桌面/移动端 |
| `/voice` | 语音（`VOICE_MODE`） |
| `/agents` | 子代理管理 |
| `/workflows` | 工作流脚本（`WORKFLOW_SCRIPTS`） |

完整列表以运行 `claude` 后 `/help` 或源码 `src/commands/` 目录为准。

---

## 5. 扩展与持久化

| 机制 | 路径/入口 | 作用 |
|------|-----------|------|
| **CLAUDE.md** | 项目根或配置目录 | 项目级持久记忆、编码约定、允许的操作边界 |
| **settings.json** | 用户/项目配置 | 模型、`allowedTools` / `disallowedTools`、输出风格等 |
| **MCP** | `/mcp` | Model Context Protocol：接数据库、浏览器、Issue 跟踪等 |
| **Skills** | `/skills`、`.cursor/skills` 类目录 | 领域工作流；`/技能名` 快捷触发 |
| **Hooks** | `/hooks` | 工具调用前后执行 shell（如保存后格式化） |
| **Plugins** | `/plugin` | 自定义命令、内置 Agent、Bundled Skills |
| **Agents 定义** | Markdown/JSON | 自定义子代理类型、系统提示、工具白名单 |
| **Scratchpad** | 会话目录 | 临时文件，避免滥用 `/tmp` |

---

## 6. 使用形态与 CLI

### 6.1 常用 CLI

| 命令 / 参数 | 说明 |
|-------------|------|
| `claude` | 进入交互会话 |
| `claude "问题"` | 带初始提示的交互会话 |
| `claude -p "问题"` | 单次查询，打印后退出（适合脚本） |
| `claude -c` | 继续上一会话 |
| `--model sonnet\|opus` | 指定模型 |

安装：官方已弃用 npm 安装为主渠道，以 [code.claude.com 文档](https://code.claude.com/docs/en/overview) 为准。

### 6.2 权限与自主度

- **默认**：修改文件、执行命令前多需用户批准
- **可配置**：从逐步批准到更自主（如 `bypassPermissions` 等模式，视版本而定）
- **Checkpoint**：大改前自动保存代码状态；`Esc` 连按或 `/rewind` 回滚

### 6.3 与 Cursor 的粗对比（WritCraft 语境）

| 维度 | Claude Code | Cursor（本仓库对标） |
|------|-------------|----------------------|
| 运行时 | 终端 / VS Code 扩展 | Electron 桌面 + 内置 Chat/Agents |
| 工具暴露 | 内置 Tool + MCP | MCP + 内置 Agent 工具 |
| 项目记忆 | `CLAUDE.md` | `.cursor/rules`、`AGENTS.md` 等 |
| 子任务 | Subagent（独立上下文） | Task / 多 Agent 侧栏 |
| 回滚 | Checkpoint / `/rewind` | 依赖 Git / 编辑器历史 |

---

## 7. 本地参考仓库说明

WritCraft 根目录：

```text
claude-code -> /Users/cuiyunfeng/workspace/claude-code
```

`.gitignore` 第 28 行：`# 本地参考仓库（符号链接）`

快照 README 摘要：

- 来源：公开曝光的 TypeScript 源码快照（2026-03-31），约 1902 文件
- **仅供研究**，非官方发行物
- 深入阅读顺序：
  1. `src/tools.ts` — 有哪些工具
  2. `src/tools/<Tool>/prompt.ts` — 模型如何被教着用
  3. `src/constants/tools.ts` + `AgentTool/` — 子代理能力边界
  4. `docs/src-tools-tutorial-zh.md` — 工具层教程
  5. `docs/claude-code-system-prompts-zh.md` — 系统提示提炼

---

## 8. 小结

**一句话：** Claude Code 是在终端/IDE 中用自然语言驱动的**全仓库 Agent**——读改代码、跑 Shell、管 Git、委派子代理，并通过 MCP / Skills / Hooks / `CLAUDE.md` 扩展；带权限分级与 checkpoint 回滚。

对 WritCraft 的参考价值：活动栏 Agents、Chat、模型设置、项目会话等能力可对齐其「工具池 + 斜杠命令 + 项目记忆 + 子代理」分层，见 `docs/proposals/proposal-ide-basics.md` 与 `docs/research/research-ide-basics.md`。
