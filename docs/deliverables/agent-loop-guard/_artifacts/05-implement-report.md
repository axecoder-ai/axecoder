# 功能实现报告 — Agent Loop Guard

## 功能说明

为 Agent 主循环与子代理增加运行时防呆（对齐 Reasonix loop guard）：

1. **Storm breaker**：同一批工具连续以相同错误失败达到阈值（默认 3）时，在 tool result 追加 `[loop guard]` 指引，并通过 `loop_guard` 进度事件通知 UI。
2. **Repeat guard**：写类工具（Write/Edit/Delete/Move、写文件 Bash）相同参数成功达到阈值（默认 2）后，第 3 次执行前直接 block。
3. **可配置**：`agentLoopGuardEnabled`、storm/repeat 阈值、`agentMaxToolRounds`（0=无限）。
4. **UI**：设置 → Agent 区新增开关与数值；聊天进度条上方显示防呆 warn 条。

## 修改文件

| 文件 | 说明 |
|------|------|
| `electron/main/agent/agent-loop-guard.ts` | 核心逻辑（新建） |
| `electron/main/agent/agent-loop.ts` | 主循环挂钩 |
| `electron/main/agent/agent-subagent.ts` | 子代理挂钩 |
| `electron/main/agent/agent-session-store.ts` | `loopGuard` 状态 |
| `electron/main/config-store.ts` | 默认配置 |
| `electron/main/models-types.ts` | 类型 |
| `src/utils/agent-progress.ts` | `loop_guard` 事件 |
| `src/components/workbench/ChatPane.vue` | 展示 notice |
| `src/components/workbench/AgentProgressStream.vue` | warn 条样式 |
| `src/components/workbench/GeneralTab.vue` | 设置项 |
| `src/types/axecoder.d.ts` | AppSettings |
| `shared/i18n/locales/en.ts` / `zh-CN.ts` | 文案 |
| `tests/unittest/UT-agent-loop-guard/` | 单测 |
| 若干测试 helper | 补 `loopGuard` 字段 |

## 注意事项

- Bash 写操作检测为启发式（重定向、python open 写模式等），与 Reasonix 一致。
- `UT-agent-os-sandbox/bash-integration.test.ts` 为既有失败（execpolicy mock 未生效），与本次改动无关。
