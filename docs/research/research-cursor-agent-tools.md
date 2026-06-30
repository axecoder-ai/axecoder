# 调研：Cursor Agent 内置工具（未公开完整清单）

- **日期：** 2026-06-10
- **范围：** Cursor IDE Agent / Plan / Ask 模式下，模型可调用的 ClientSideToolV2、Composer 侧工具名、ACP 扩展、Task 子代理类型
- **参考来源：**
  - [Cursor Plan Mode 文档](https://cursor.com/docs/agent/plan-mode)
  - [Cursor ACP 文档](https://cursor.com/docs/cli/acp)
  - [eisbaw/cursor_api_demo](https://github.com/eisbaw/cursor_api_demo) — 逆向 `aiserver.v1.ClientSideToolV2`（约 v2.6.x）
  - Composer Agent 运行时工具注入（会话实测）

> **说明：** Cursor **从未官方公布**完整 Agent 工具列表。下文来自协议逆向、ACP 文档、Plan Mode 公开说明及 Agent 运行时行为；**任意一次对话通常只注入子集**，且随模式（Agent / Plan / Ask）、订阅、功能开关变化。

---

## 1. 交互模式（决定工具集，非工具本身）

| 模式 | 说明 |
|------|------|
| **agent** | 全工具访问 |
| **plan** | 只读行为 + 计划相关工具（如 `create_plan`） |
| **ask** | 只读问答 |

切换方式：模式选择器、`Shift+Tab`、或 Agent 调用 **SwitchMode**。

---

## 2. 后端全量工具（`ClientSideToolV2`，共 44 个）

来源：`eisbaw/cursor_api_demo` 中 `ClientSideToolV2` 枚举（protobuf `aiserver.v1`）。

| ID | 内部枚举名 | 常见 Agent 侧名称 / 用途 |
|----|-----------|-------------------------|
| 0 | UNSPECIFIED | — |
| 1 | READ_SEMSEARCH_FILES | 语义搜索后读文件 |
| 3 | RIPGREP_SEARCH | **Grep** |
| 5 | READ_FILE | **Read**（旧版） |
| 6 | LIST_DIR | 列目录 |
| 7 | EDIT_FILE | **Edit / StrReplace**（旧版） |
| 8 | FILE_SEARCH | 模糊文件名搜索 |
| 9 | SEMANTIC_SEARCH_FULL | **SemanticSearch** |
| 11 | DELETE_FILE | **Delete** |
| 12 | REAPPLY | 重新应用上一次编辑 |
| 15 | RUN_TERMINAL_COMMAND_V2 | **Shell** |
| 16 | FETCH_RULES | 拉取 `.cursor/rules` |
| 18 | WEB_SEARCH | **WebSearch** |
| 19 | MCP | 调 MCP（旧版） |
| 23 | SEARCH_SYMBOLS | 符号搜索 |
| 24 | BACKGROUND_COMPOSER_FOLLOWUP | 后台 Composer 跟进 |
| 25 | KNOWLEDGE_BASE | 知识库查询 |
| 26 | FETCH_PULL_REQUEST | 拉取 PR 信息 |
| 27 | DEEP_SEARCH | 深度代码库搜索 |
| 28 | CREATE_DIAGRAM | 生成 Mermaid 图 |
| 29 | FIX_LINTS | 自动修 lint |
| 30 | READ_LINTS | **ReadLints** |
| 31 | GO_TO_DEFINITION | 跳转定义 |
| 32 | TASK | **Task**（子代理，旧版） |
| 33 | AWAIT_TASK | **Await** |
| 34 | TODO_READ | 读 todo |
| 35 | TODO_WRITE | **TodoWrite** |
| 38 | EDIT_FILE_V2 | **Edit / StrReplace / Write**（新版） |
| 39 | LIST_DIR_V2 | 树形列目录 |
| 40 | READ_FILE_V2 | **Read**（新版） |
| 41 | RIPGREP_RAW_SEARCH | Grep 原始 ripgrep |
| 42 | GLOB_FILE_SEARCH | **Glob** |
| 43 | CREATE_PLAN | **create_plan** |
| 44 | LIST_MCP_RESOURCES | 列 MCP 资源 |
| 45 | READ_MCP_RESOURCE | **FetchMcpResource** |
| 46 | READ_PROJECT | 读项目信息 |
| 47 | UPDATE_PROJECT | 更新项目信息 |
| 48 | TASK_V2 | **Task**（新版） |
| 49 | CALL_MCP_TOOL | **CallMcpTool** |
| 50 | APPLY_AGENT_DIFF | 应用 Agent diff |
| 51 | ASK_QUESTION | **AskQuestion** |
| 52 | SWITCH_MODE | **SwitchMode** |
| 53 | GENERATE_IMAGE | **GenerateImage** |
| 54 | COMPUTER_USE | 键鼠自动化（Computer Use） |
| 55 | WRITE_SHELL_STDIN | 向 Shell 写 stdin |

**注：** ID 2、4、10 等空缺为 enum 预留或未在公开逆向中出现；V1/V2 并存（如 READ_FILE 与 READ_FILE_V2）表示协议演进，客户端可能只注册其一。

---

## 3. Composer Agent 会话常见「模型侧工具名」

模型在 system prompt 中看到的名称与后端 enum **不完全一一对应**；以下为 Composer Agent 模式常见注入集。

### 3.1 文件与搜索

| 工具名 | 作用 | 大致对应 enum |
|--------|------|---------------|
| Read | 读文件 | READ_FILE_V2 |
| Write | 写/覆盖文件 | EDIT_FILE_V2 |
| StrReplace | 精确替换（Edit） | EDIT_FILE_V2 |
| Delete | 删文件 | DELETE_FILE |
| Glob | 按 glob 找文件 | GLOB_FILE_SEARCH |
| Grep | 内容搜索 | RIPGREP_SEARCH / RIPGREP_RAW_SEARCH |
| SemanticSearch | 语义代码搜索 | SEMANTIC_SEARCH_FULL 等 |
| ReadLints | 读 IDE 诊断 | READ_LINTS |
| EditNotebook | 改 `.ipynb` | （较新，未必在旧 enum） |

### 3.2 终端与后台

| 工具名 | 作用 | 大致对应 enum |
|--------|------|---------------|
| Shell | 跑终端命令 | RUN_TERMINAL_COMMAND_V2 |
| Await | 轮询后台 Shell/任务 | AWAIT_TASK |

Shell 常见内部参数（非独立工具）：

- `block_until_ms` — 阻塞时长
- `notify_on_output` — 输出匹配通知
- `requestSmartModeApproval` — Smart Mode 审批流

### 3.3 联网

| 工具名 | 作用 | 大致对应 enum |
|--------|------|---------------|
| WebSearch | 网页搜索 | WEB_SEARCH |
| WebFetch | 抓取 URL | （较新，旧 enum 可能无独立项） |

### 3.4 用户交互与任务

| 工具名 | 作用 | 大致对应 enum |
|--------|------|---------------|
| AskQuestion | 结构化多选题 | ASK_QUESTION |
| TodoWrite | 写 todo 列表 | TODO_WRITE |
| GenerateImage | 文生图 | GENERATE_IMAGE |

### 3.5 模式与规划

| 工具名 | 作用 | 大致对应 enum |
|--------|------|---------------|
| SwitchMode | 切换 agent / plan 等 | SWITCH_MODE |
| create_plan | 生成交互式计划（Build 按钮） | CREATE_PLAN |

`create_plan` 通常在 **Plan 模式**下可用；内置 playbook（如 `/create-plan`）会显式要求先 `SwitchMode` 再 `create_plan`。

### 3.6 子代理与 MCP

| 工具名 | 作用 | 大致对应 enum |
|--------|------|---------------|
| Task | 派生子代理 | TASK_V2 |
| CallMcpTool | 调 MCP 工具 | CALL_MCP_TOOL |
| FetchMcpResource | 读 MCP 资源 | READ_MCP_RESOURCE |

---

## 4. 同类 Agent 同源、部分会话可见的工具

Cursor Agent 与 同类 Agent 工具层有重叠；下列工具**不一定每次会话都注入**，但在 playbook / 技能 / 部分构建中会出现。

| 工具名 | 作用 |
|--------|------|
| EnterPlanMode / ExitPlanMode | 进/出只读规划（与 SwitchMode 部分重叠） |
| ToolSearch | 工具池过大时按关键词解锁更多工具 |
| Skill / DiscoverSkills | 加载 / 列举 `.cursor/skills` |
| McpAuth | MCP 鉴权 |
| ListMcpResources / ReadMcpResource | MCP 资源浏览 |
| TaskOutput / TaskStop | 读 / 停后台子代理 |
| Move | 移动 / 重命名文件 |
| NotebookEdit | 同 EditNotebook 别名 |

---

## 5. ACP 协议扩展方法（CLI / 第三方编辑器）

来源：[Cursor ACP 文档](https://cursor.com/docs/cli/acp)。

| 方法 | 类型 | 作用 |
|------|------|------|
| `cursor/ask_question` | **阻塞** | 结构化提问，Agent 等客户端回复 |
| `cursor/create_plan` | **阻塞** | 计划审批，等用户接受/拒绝 |
| `cursor/update_todos` | 通知 | todo 状态更新 |
| `cursor/task` | 通知 | 子代理任务完成 |
| `cursor/generate_image` | 通知 | 图片生成结果 |

---

## 6. Task 子代理类型（`Task` 的 `subagent_type`）

| 类型 | 用途 |
|------|------|
| generalPurpose | 通用子代理 |
| explore | 快速探库（只读） |
| shell | 命令执行专精 |
| cursor-guide | Cursor 产品文档 |
| ci-investigator | 查 PR CI 失败 |
| bugbot | 代码审查（Bugbot 类） |
| security-review | 安全审查 |
| best-of-n-runner | 隔离 git worktree 多方案 |
| git-commit | 生成 git commit |
| docs-researcher | 查第三方库文档 |

子代理可用模型（会话级限制，非工具）：如 `composer-2.5`、`composer-2.5-fast`、`kimi-k2.5` 等，以当前 Cursor 构建为准。

---

## 7. 逆向 enum 中有、Composer 常不显式暴露的能力

下列多在特定页面、功能开关或旧版 Composer 中出现，Agent 对话里不一定可见：

| enum | 用途 |
|------|------|
| LIST_DIR / LIST_DIR_V2 | 列目录 / 目录树 |
| FILE_SEARCH | 模糊找文件 |
| REAPPLY | 重试上次编辑 |
| FETCH_RULES | 读 Cursor Rules |
| SEARCH_SYMBOLS / GO_TO_DEFINITION | LSP 类导航 |
| KNOWLEDGE_BASE | 知识库 |
| FETCH_PULL_REQUEST | GitHub PR |
| DEEP_SEARCH | 深度搜索 |
| CREATE_DIAGRAM | Mermaid 图 |
| FIX_LINTS | 自动修 lint |
| BACKGROUND_COMPOSER_FOLLOWUP | 后台 Agent 跟进 |
| READ_PROJECT / UPDATE_PROJECT | 项目元信息 |
| APPLY_AGENT_DIFF | 应用 diff |
| COMPUTER_USE | 计算机自动化 |
| WRITE_SHELL_STDIN | 交互式 Shell 输入 |
| MCP（legacy） | 旧版 MCP 调用 |

---

## 8. 与 AxeCoder 对齐时的建议

1. **实现缺口：** 见 **[research-agent-tools-matrix.md](./research-agent-tools-matrix.md)**（六项目对照矩阵）。
2. **两层映射：** 以 §2 enum 为协议层，§3 模型侧名称为产品层；playbook 优先 **SwitchMode、create_plan、AskQuestion、Task、SemanticSearch**。
3. **模式正交：** `SwitchMode` / `create_plan` 与会话 ChatMode、planMode 是不同维度；见 `docs/deliverables/switch-mode-tool/`。
4. **不要假设全量注入：** 默认 Agent 可能只有 Read/Edit/Shell/Grep/Glob 等子集；扩展工具需 ToolSearch 或模式切换解锁。
5. **版本漂移：** enum 来自约 v2.6.x 逆向；Cursor 更新后 ID/名称可能增减，需定期对照新版本客户端。

---

## 9. 统计摘要

| 类别 | 数量 |
|------|------|
| ClientSideToolV2 enum | 44 |
| Composer 常见模型侧工具名 | ~20 |
| 同类 Agent 同源可选工具 | ~10 |
| ACP 扩展方法 | 5 |
| Task 子代理类型 | 10 |
| **生态合计（去重前）** | **50+ 种能力** |

任意单次 Agent 会话通常只暴露其中 **一部分**。

---

## 10. AxeCoder 实现对照

**完整六列矩阵**（Cursor · DeepSeek-TUI · 同类 Agent · OpenCode · Reasonix · AxeCoder）见：

→ **[research-agent-tools-matrix.md](./research-agent-tools-matrix.md)**

该文档按能力纵轴、`[已实现|部分实现|未实现]` 填格，覆盖工具与 harness 特性（沙箱、auto_plan、MCP、子代理类型等）。本节不再重复维护单列 AxeCoder 清单。
