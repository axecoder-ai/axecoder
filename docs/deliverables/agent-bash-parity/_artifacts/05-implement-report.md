# 功能实现报告 — agent-bash-parity

## 功能说明

按已确认方案 2，将 Claude Code `Bash` 工具**对外契约**对齐到 AxeCoder：

- 参数：`timeout`（兼容 `timeout_ms`）、`description`、`run_in_background`
- 前台：用户批准后仍用 `runAgentBash` 阻塞执行
- 后台：`run_in_background: true` 时 `startBackgroundBash` 返回 task id，模型用 `TaskOutput` 读取 `agent-bash-tasks` 中的输出
- UI：`ChatBashCard` 展示 description 与后台待执行提示
- 提示词：更新 `BASH_DESCRIPTION`，移除「无后台 UI」表述

**未实现（二期）：** 持久 shell 会话、15s 自动后台、沙箱、bash classifier。

## 修改文件列表

| 路径 | 说明 |
|------|------|
| `electron/main/agent/agent-bash-tasks.ts` | 新增后台 shell 任务表 |
| `electron/main/agent/agent-bash.ts` | `parseBashTimeoutMs`、`formatBackgroundBashStarted`、`trimBashOutput` |
| `electron/main/agent/agent-tool-prompts.ts` | schema + description |
| `electron/main/agent/tool-executor.ts` | Bash 参数与 apply 分支 |
| `electron/main/agent/agent-ext-executor.ts` | `TaskOutput` 合并 shell 任务 |
| `electron/main/agent/agent-types.ts` | `PendingBashPublic` 扩展 |
| `electron/main/agent/agent-session-store.ts` | pending 序列化 |
| `src/types/axecoder.d.ts` | 前端类型 |
| `src/components/workbench/ChatBashCard.vue` | description / background UI |
| `tests/unittest/UT-agent-bash-parity/agent-bash-parity.test.ts` | 新增单测 |

## 单测覆盖

- schema 字段注册
- `parseBashTimeoutMs` 别名与封顶
- 后台 `echo` 完成与 `formatShellTaskOutput`
- `executeAgentTool` `run_in_background` pending 字段
- 前台 `runAgentBash` 回归

## 注意事项

- 每次 Bash 仍为独立 `spawn -lc`，cwd 为 projectRoot，**不**跨调用保留 shell 状态。
- 后台任务与子代理任务共用 `TaskOutput`，按 `task_id` 前缀/查表顺序区分（先 subagent 后 shell）。
- Windows 未专项验证；用户选型接受后续再做。
