# Agent 工具与特性 — 跨项目对照矩阵

- **日期：** 2026-06-10（ShellStdin/Bash.stdin、TaskStop 取消后台 Shell、ReadLints/FixLints、WebRun、跨平台沙箱、McpAuth/OAuth、Provider 抽象同步）
- **纵轴：** 能力项（工具 +  harness 特性）
- **横轴：** Cursor · DeepSeek-TUI · Claude Code · OpenCode · Reasonix · **AxeCoder（本系统）**
- **单元格：** `已实现` · `部分实现` · `未实现` · `—`（非该产品形态 / 不适用）

**代码来源（本地）：**

| 项目 | 路径 |
|------|------|
| Cursor | 协议逆向 + Composer 运行时（见 [research-cursor-agent-tools.md](./research-cursor-agent-tools.md)） |
| DeepSeek-TUI | `DeepSeek-TUI/crates/tui/src/tools/` |
| Claude Code | `~/workspace/claude-code/src/tools.ts` |
| OpenCode | `~/workspace/opencode/packages/opencode/src/tool/registry.ts` |
| Reasonix | `Reasonix/internal/tool/`、`Reasonix/internal/agent/` |
| AxeCoder | `electron/main/agent/` |

> **读表说明：** 「部分实现」= 有等价能力但 stub、别名缺失、功能开关、或仅 harness/UI 层无同名工具。同一能力在不同产品**工具名可能不同**（如 `bash` / `Shell` / `exec_shell`），矩阵按**语义**对齐。

---

## 图例

| 标记 | 含义 |
|------|------|
| **已实现** | 默认可用或稳定注册，核心行为完整 |
| **部分实现** | 有入口但裁剪、stub、需配置、或仅有间接替代 |
| **未实现** | 无对应能力 |
| **—** | 不在该产品职责内，或无从对齐 |

---

## 1. 文件与编辑

| 能力 | Cursor | DeepSeek-TUI | Claude Code | OpenCode | Reasonix | AxeCoder |
|------|--------|--------------|-------------|----------|----------|----------|
| 读文件 Read | 已实现 | 已实现 `read_file` | 已实现 | 已实现 `read` | 已实现 `read_file` | 已实现 `Read` |
| 写文件 Write | 已实现 | 已实现 `write_file` | 已实现 | 已实现 `write` | 已实现 `write_file` | 已实现 `Write` |
| 精确编辑 Edit / StrReplace | 已实现 | 已实现 `edit_file` | 已实现 | 已实现 `edit` | 已实现 `edit_file` | 已实现 `Edit` |
| 批量/多处编辑 | 未实现 | 未实现 | 未实现 | 未实现 | 已实现 `multi_edit` | 未实现 |
| 删除文件 Delete | 已实现 | 未实现（无独立工具） | 未实现 | 未实现 | 部分 `delete_range` / `delete_symbol` | 已实现 `Delete` |
| 移动/重命名 Move | 未实现 | 未实现 | 未实现 | 未实现 | 未实现 | 已实现 `Move` |
| 列目录 ListDir | 部分 enum | 已实现 `list_dir` | 未实现 | 未实现 | 已实现 `ls` | 未实现 |
| Glob 找文件 | 已实现 | 部分 `file_search` | 已实现 | 已实现 `glob` | 已实现 `glob` | 已实现 `Glob` |
| Grep 内容搜索 | 已实现 | 已实现 `grep_files` | 已实现 | 已实现 `grep` | 已实现 `grep` | 已实现 `Grep` |
| 语义 / 深度代码搜索 | 已实现 SemanticSearch | 未实现 | 未实现 | 未实现 | 部分 CodeGraph MCP | 部分 `CodeGraph*`（默认开，索引非向量语义） |
| Notebook 编辑 | 已实现 | 未实现 | 已实现 | 未实现 | 已实现 `notebook_edit` | 已实现 `NotebookEdit` |
| Apply patch / diff 应用 | 部分 | 已实现 `apply_patch` | 部分 Edit 流 | 已实现 `apply_patch` | 部分 preview | 部分 审批 diff |
| 撤销本轮编辑 Revert | 未实现 | 已实现 `revert_turn` | 部分 `/rewind` | 未实现 | 未实现 | 部分 checkpoint |

---

## 2. 终端与后台任务

| 能力 | Cursor | DeepSeek-TUI | Claude Code | OpenCode | Reasonix | AxeCoder |
|------|--------|--------------|-------------|----------|----------|----------|
| 执行 Shell / Bash | 已实现 `Shell` | 已实现 `exec_shell` | 已实现 `Bash` | 已实现 `bash` | 已实现 `bash` | 已实现 `Bash` |
| 后台 Shell + 等待 | 已实现 `Await` | 已实现 `exec_shell_wait` 等 | 已实现 | 部分 BackgroundJob | 已实现 `wait` / `bash_output` | 部分 `run_in_background`+`TaskOutput` |
| Shell 交互 stdin | 部分 `WRITE_SHELL_STDIN` | 已实现 `exec_shell_interact` | 部分 | 未实现 | 未实现 | 已实现 `ShellStdin`+Bash.stdin |
| 取消 Shell | 部分 | 已实现 shell cancel | 部分 | 未实现 | 已实现 `kill_shell` | 已实现 `TaskStop`（后台 Bash；前台同步不可取消） |
| PowerShell 专工具 | 未实现 | 未实现 | 部分 feature | 未实现 | 部分 Windows bash | 未实现 |
| OS 级文件沙箱 | — | 已实现 Seatbelt/bwrap | 部分 | 未实现 | 已实现 | 已实现 macOS Seatbelt + Linux bwrap（Windows 无 FS 沙箱） |
| Exec 命令策略 execpolicy | 未实现 | 已实现 | 部分 permissions | 部分 permission rules | 部分 | 已实现 |
| Smart Mode 审批参数 | 部分 | 未实现 | 未实现 | 未实现 | 未实现 | 未实现 |

---

## 3. 模式与规划

| 能力 | Cursor | DeepSeek-TUI | Claude Code | OpenCode | Reasonix | AxeCoder |
|------|--------|--------------|-------------|----------|----------|----------|
| Agent / Plan / Ask 模式 | 已实现 UI+SwitchMode | 部分 模式引擎 | 部分 | 部分 agent 配置 | 部分 plan 门控 | 部分实现 ChatMode+SwitchMode |
| SwitchMode 工具 | 已实现 | 未实现 | 未实现 | 未实现 | 未实现 | 已实现 |
| create_plan（Build 按钮） | 已实现 | 未实现 | 未实现 | 未实现 | 未实现 | 未实现 |
| EnterPlanMode / ExitPlanMode | 部分 | 部分 plan 模式工具集 | 已实现 | 部分 `plan_exit` 实验 | 部分 `SetPlanMode` harness | 已实现 |
| update_plan / 计划步骤工具 | 部分 create_plan | 已实现 `update_plan` | 部分 VerifyPlan | 未实现 | 未实现 | 未实现 |
| auto_plan 自动进规划 | 部分 UI 建议 | 未实现 | 未实现 | 未实现 | 已实现 harness | 部分 |
| 只读规划门控写/Bash | 已实现 | 已实现 | 已实现 | 部分 permission | 已实现 | 已实现 |

---

## 4. 用户交互

| 能力 | Cursor | DeepSeek-TUI | Claude Code | OpenCode | Reasonix | AxeCoder |
|------|--------|--------------|-------------|----------|----------|----------|
| 结构化提问 AskQuestion | 已实现 | 已实现 `request_user_input` | 已实现 | 部分 `question` | 已实现 `ask` | 已实现 `AskUserQuestion` |
| Brief 简报 | 未实现 | 未实现 | 已实现 | 未实现 | 未实现 | 部分 stub |
| 桌面通知 notify | 未实现 | 已实现 `notify` | 部分 push | 未实现 | 部分 | 未实现 |

---

## 5. 子代理 / Task

| 能力 | Cursor | DeepSeek-TUI | Claude Code | OpenCode | Reasonix | AxeCoder |
|------|--------|--------------|-------------|----------|----------|----------|
| Task 派生子代理 | 已实现 | 已实现 subagent 族 | 已实现 `Agent` | 已实现 `task` | 已实现 `task` | 已实现 `Task` |
| explore / shell 等类型 | 已实现多种 | 部分 | 已实现 | 部分 agent 配置 | 部分 | 已实现 CC 对齐集 |
| bugbot / security-review | 已实现 | 部分 `review` | 未实现 | 未实现 | 未实现 | 未实现 |
| TaskOutput / 读后台输出 | 部分 Await | 部分 | 已实现 | 部分 | 部分 `bash_output` | 已实现 |
| TaskStop | 部分 | 部分 | 已实现 | 部分 | 已实现 `kill_shell` | 已实现 |
| 子代理不可递归 | 已实现 | 已实现 | 已实现 | 部分 | 部分 | 已实现 |
| 并行子代理 best-of-n | 部分 | 未实现 | 部分 swarms | 未实现 | 未实现 | 部分 stub worktree |
| Coordinator 多 Agent | 未实现 | 未实现 | 部分 feature | 未实现 | 部分 coordinator | 已实现 Workshop + Coordinator 工具 |

---

## 6. MCP 与插件

| 能力 | Cursor | DeepSeek-TUI | Claude Code | OpenCode | Reasonix | AxeCoder |
|------|--------|--------------|-------------|----------|----------|----------|
| CallMcpTool | 已实现 | 已实现 MCP 池 | 已实现 | 已实现 + 插件 | 已实现 `mcp__*` | 已实现 |
| ListMcpResources | 已实现 | 部分 | 已实现 | 已实现 | 部分 | 已实现 |
| ReadMcpResource | 已实现 | 部分 | 已实现 | 已实现 | 部分 | 已实现 |
| McpAuth / OAuth 流程 | 部分 | 部分 | 已实现 | 部分 | 部分 plugin | 部分实现 `McpAuth`+Settings OAuth（内置插件） |
| 运行时插件工具 | 未实现 | 已实现 `plugin` 覆盖 | 部分 | 已实现 plugin | 已实现 stdio plugin | 部分实现 Settings 内置插件（context7） |
| ToolSearch 懒加载工具 | 部分 | 未实现 | 部分 feature | 未实现 | 未实现 | 已实现 |

> **AxeCoder MCP 鉴权（2026-06-10）：** Settings → MCP「连接」与 Agent `McpAuth` 共用 `connectMcpPluginOAuth`（浏览器 + loopback）；token 存 `~/.axecoder/mcp-oauth.json`。仅覆盖**内置 OAuth 插件**（如 context7），`mcp.json` 任意 server 的通用 OAuth 未实现。见 `docs/deliverables/agent-mcp-auth/`。

---

## 7. 联网

| 能力 | Cursor | DeepSeek-TUI | Claude Code | OpenCode | Reasonix | AxeCoder |
|------|--------|--------------|-------------|----------|----------|----------|
| WebFetch | 已实现 | 已实现 `fetch_url` | 已实现 | 已实现 `webfetch` | 已实现 `web_fetch` | 已实现 |
| WebSearch | 已实现 | 已实现 feature 门控 | 已实现 | 部分 provider 门控 | 未实现 builtin | 部分 Serper API（需 `agentFeatureWebSearch`+API key） |
| WebRun / 浏览器自动化 | 未实现 | 已实现 `web_run` | 部分 WebBrowser | 未实现 | 未实现 | 部分 Playwright `WebRun`（需 `agentFeatureWebRun`） |
| Computer Use 键鼠 | 部分 | 未实现 | 未实现 | 未实现 | 未实现 | 未实现 |

---

## 8. Skill / 斜杠 / 工作流

| 能力 | Cursor | DeepSeek-TUI | Claude Code | OpenCode | Reasonix | AxeCoder |
|------|--------|--------------|-------------|----------|----------|----------|
| Skill 加载 | 已实现 | 已实现 `load_skill` | 已实现 | 已实现 `skill` | 已实现 `run_skill` | 已实现 `Skill` |
| DiscoverSkills | 已实现 | 部分 系统提示 | 部分 | 部分 skill 列表 | 部分 | 已实现 |
| 斜杠命令工具化 | 未实现 | 未实现 | 已实现 commands | 部分 | 已实现 `slash_command` | 部分 builtin |
| Workflow 脚本工具 | 未实现 | 部分 automation | 部分 feature | 未实现 | 未实现 | 部分 stub |
| Hooks 生命周期 | 未实现 | 已实现 hook_executor | 已实现 | 部分 plugin | 部分 | 已实现 `agent-hooks.ts` + `/hooks` |

---

## 9. Todo / 任务跟踪

| 能力 | Cursor | DeepSeek-TUI | Claude Code | OpenCode | Reasonix | AxeCoder |
|------|--------|--------------|-------------|----------|----------|----------|
| TodoWrite | 已实现 | 已实现 `todo_write` 等 | 已实现 | 已实现 `todowrite` | 已实现 `todo_write` | 已实现 |
| Todo v2 TaskCreate/Get/… | 未实现 | 已实现 `task_*` 族 | 部分 feature | 未实现 | 未实现 | 已实现 |
| Checklist 变体 | 未实现 | 已实现 checklist_* | 未实现 | 未实现 | 未实现 | 未实现 |
| complete_step 步骤验收 | 未实现 | 未实现 | 未实现 | 未实现 | 已实现 | 未实现 |
| update_plan 与 todo 分工 | 部分 | 已实现 | 未实现 | 未实现 | 未实现 | 未实现 |

---

## 10. LSP / 诊断 / 代码智能

| 能力 | Cursor | DeepSeek-TUI | Claude Code | OpenCode | Reasonix | AxeCoder |
|------|--------|--------------|-------------|----------|----------|----------|
| LSP 工具（定义/引用等） | 部分 enum | 部分 LspManager | 部分 `ENABLE_LSP` | 部分 experimental | 部分 `lsp_diagnostics` | 部分 `LSP`（需 `agentFeatureLsp`） |
| ReadLints / 读 IDE 诊断 | 已实现 | 部分 `diagnostics` | 未实现 | 未实现 | 部分 | 部分 `ReadLints`（需 `agentFeatureLsp`） |
| FixLints 自动修 | 部分 | 未实现 | 未实现 | 未实现 | 未实现 | 部分 `FixLints`（LSP codeAction，需 `agentFeatureLsp`） |
| CodeGraph 代码图 | 未实现 | 未实现 | 未实现 | 未实现 | 部分 MCP | 已实现 `CodeGraphExplore/Search/Node`（默认开） |
| FIM 中置编辑 | 未实现 | 已实现 `fim_edit` | 未实现 | 未实现 | 未实现 | 未实现 |

---

## 11. Git / PR / 自动化（偏 DeepSeek 扩展）

| 能力 | Cursor | DeepSeek-TUI | Claude Code | OpenCode | Reasonix | AxeCoder |
|------|--------|--------------|-------------|----------|----------|----------|
| git status / diff | 未实现 | 已实现 | 未实现 | 未实现 | 未实现 | 未实现 |
| git log / blame / show | 未实现 | 已实现 | 未实现 | 未实现 | 未实现 | 未实现 |
| GitHub issue/PR 上下文 | 部分 | 已实现 github_* | 部分 GitHub 集成 | 未实现 | 未实现 | 未实现 |
|  durable task / automation | 未实现 | 已实现 task/automation 族 | 部分 cron | 未实现 | 未实现 | 未实现 |
| git worktree 隔离 | 部分 | 未实现 | 部分 feature | 未实现 | 未实现 | 部分 stub |

---

## 12. 记忆 / 配置 / 会话

| 能力 | Cursor | DeepSeek-TUI | Claude Code | OpenCode | Reasonix | AxeCoder |
|------|--------|--------------|-------------|----------|----------|----------|
| Remember / 持久记忆 | 未实现 | 已实现 `remember` | 部分 `/memory` | 未实现 | 已实现 | 已实现 |
| Forget | 未实现 | 未实现 | 部分 | 未实现 | 已实现 | 已实现 |
| Config 工具读配置 | 未实现 | 未实现 | 部分 ant | 未实现 | 未实现 | 部分 `Config` |
| 上下文 compact 压缩 | 部分 | 未实现 | 已实现 `/compact` | 部分 compaction | 已实现 harness | 未实现 |
| Checkpoint / rewind | 未实现 | 部分 snapshot | 已实现 | 部分 | 未实现 | 部分 |
| Sleep / 自主 tick | 未实现 | 未实现 | 部分 feature | 未实现 | 未实现 | 部分 stub |

---

## 13. 沙箱 / 权限 / 防呆

| 能力 | Cursor | DeepSeek-TUI | Claude Code | OpenCode | Reasonix | AxeCoder |
|------|--------|--------------|-------------|----------|----------|----------|
| 工具权限 rules 引擎 | 部分 | 部分 approval | 已实现 | 已实现 | 已实现 | 已实现 |
| Loop guard 重复调用拦截 | 未实现 | 部分 | 未实现 | 未实现 | 已实现 | 已实现 |
| 写操作用户审批 | 已实现 | 已实现 | 部分 | 已实现 ask | 部分 preview | 已实现 |
| 并行无依赖 tool call | 已实现 | 已实现 | 已实现 | 已实现 | 部分 ReadOnly 批 | 已实现 |

---

## 14. 多媒体 / 其它 Cursor 专有

| 能力 | Cursor | DeepSeek-TUI | Claude Code | OpenCode | Reasonix | AxeCoder |
|------|--------|--------------|-------------|----------|----------|----------|
| GenerateImage | 已实现 | 部分 vision | 未实现 | 未实现 | 未实现 | 未实现 |
| 语音 TTS / speech | 未实现 | 已实现 | 未实现 | 未实现 | 未实现 | 未实现 |
| RLM 持久 REPL 会话 | 未实现 | 已实现 rlm_* | 部分 REPL ant | 未实现 | 未实现 | 未实现 |
| Review 专审工具 | 部分 subagent | 已实现 `review` | 部分 | 未实现 | 未实现 | 未实现 |
| Pandoc / OCR 等 | 未实现 | 部分 条件注册 | 未实现 | 未实现 | 未实现 | 未实现 |
| Slop ledger 架构债 | 未实现 | 已实现 | 未实现 | 未实现 | 未实现 | 未实现 |
| Finance 行情 | 未实现 | 已实现 | 未实现 | 未实现 | 未实现 | 未实现 |

---

## 15. 产品形态（非工具，供对照）

| 特性 | Cursor | DeepSeek-TUI | Claude Code | OpenCode | Reasonix | AxeCoder |
|------|--------|--------------|-------------|----------|----------|----------|
| 载体 | IDE | TUI | CLI/IDE/GitHub | CLI/TUI/Desktop | CLI + Desktop | Electron IDE |
| 多模型 Provider 抽象 | 已实现 | 部分 DeepSeek | 已实现 Anthropic | 已实现 | 已实现 | 已实现 四 Provider Adapter |
| ACP 第三方客户端 | 已实现 | 未实现 | 未实现 | 部分 | 部分 | 未实现 |

---

## 16. 汇总（粗略计数 · §1–§14 主矩阵行）

| 项目 | 已实现 | 部分实现 | 未实现 |
|------|--------|----------|--------|
| **Cursor** | ~45 | ~12 | ~8 |
| **DeepSeek-TUI** | ~38 | ~8 | ~19 |
| **Claude Code** | ~32 | ~14 | ~19 |
| **OpenCode** | ~22 | ~10 | ~27 |
| **Reasonix** | ~28 | ~14 | ~22 |
| **AxeCoder** | ~35 | ~18 | ~12 |

> 计数为人工估算，用于排期优先级；不以「工具个数」精确对齐 protobuf enum。

---

## 17. AxeCoder 优先补齐（相对 Cursor playbook）

**近期已闭合：** SwitchMode · MCP 运行时 · `McpAuth`（内置插件 OAuth）· Provider 抽象（Ollama/Anthropic/OpenAI/Codex）· **ReadLints / FixLints** · **WebRun**（Playwright）· **跨平台 OS 沙箱**（macOS+Linux）· **ShellStdin** + Bash.stdin · **TaskStop** 取消后台 Shell

1. **create_plan** + Plan Build UI  
2. **SemanticSearch** 向量语义搜索（CodeGraph 已覆盖结构搜索）  
3. **WebSearch** 默认开启 / 多 provider（Serper 已接，仍 feature 门控）  
4. **bugbot / security-review** 子代理  
5. **mcp.json 通用 OAuth**（非内置插件）  
6. **StrReplace / Shell / FetchMcpResource** 别名兼容 Cursor  
7. **Await** 独立工具名（当前 `TaskOutput`+`run_in_background` 替代）  
8. **前台同步 Bash 取消**（abort / 进程注册表；后台已由 TaskStop 覆盖）  

详见 [research-cursor-agent-tools.md §10.6](./research-cursor-agent-tools.md)。
