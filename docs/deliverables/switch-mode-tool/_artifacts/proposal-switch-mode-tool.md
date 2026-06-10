# SwitchMode 工具 — 已确认方案

**状态：** 已确认

**日期：** 2025-06-10

---

## Confirmed Solution Proposal

**Context:**

- **Request:** 新增 SwitchMode 工具，Cursor 兼容 `target_mode_id`，并扩展 ChatModeId 子集切换 + Renderer UI 同步。
- **Research sources:** `agent-ext-executor.ts`、`chat-mode.ts`、`rppit-axecoder-addon.ts`、`ChatPane.vue`
- **Selected base:** 提案 2 – SwitchMode 统一会话模式
- **User adjustments:** 无额外调整

## 方案概述

新增 `SwitchMode({ target_mode_id, explanation? })` Agent 工具：

| target_mode_id | 映射 ChatModeId | planMode | activeTools |
|----------------|-----------------|----------|-------------|
| `agent` | agent | false | 默认（revealed 集） |
| `plan` | planning（Cursor 别名） | true | 默认 |
| `planning` | planning | true | 默认 |
| `planning-only` | planning-only | true | explore 只读集 |
| `auto-plan` | auto-plan | false | 默认 |
| `reflection` | reflection | false | 默认 |

禁止经 SwitchMode 切入 `rppit` / `multi-agent`（会话语义特殊）。

## 关键改动

1. `chat-mode.ts` — `applySwitchModeToSession(session, target)`
2. `StoredAgentSession.chatMode` — 会话当前模式
3. `agent-ext-executor.ts` — SwitchMode 分发 + `emitAgentProgress({ kind: 'chat_mode' })`
4. `agent-progress.ts` / `axecoder.d.ts` — 新 progress 事件类型
5. `ChatPane.vue` — 监听 `chat_mode` 更新下拉 + localStorage
6. 工具注册、`rppit-axecoder-addon.ts`、保留 Enter/Exit
7. 单测 `UT-switch-mode-tool`

## 验证

- 单元测试：target 解析、planMode/tools 切换、非法 target、executor 集成
- 回归：`UT-agent-tool-layer-parity` EnterPlanMode 仍通过

## 不在范围

- 动态切换 system prompt 中 chat-mode addon（会话已开始；后续轮次以 planMode/tools 为准）
- Workshop multi-agent 模式经 SwitchMode 切换
