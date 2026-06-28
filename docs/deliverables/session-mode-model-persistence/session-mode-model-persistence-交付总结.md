---
任务名: session-mode-model-persistence
完成日期: 2026-06-28
选定方案: 提案 1 – 就地扩展 Session 字段
审查结论: 通过
本功能单测: 全绿
---

# Session Mode/Model 按会话记忆 — 交付总结

## 1. 概述

**需求：** 每个聊天 session 在发送消息时记住 Mode 与 Model，切换回来时恢复；旧 session 无记录则保持当前 UI；新建用全局默认；嵌入 Workshop 一并恢复状态。

**选型：** 推荐并采用提案 1（最小改动），resolve/stamp 抽到 `session-preferences.ts` 便于单测。

**交付物目录：** `docs/deliverables/session-mode-model-persistence/_artifacts/`

---

## 2. 方案

- `ChatSession` 增加 `modelId`
- 纯函数层处理切换解析与发送写入
- ChatPane / WorkshopChatSection 接入
- 全文见 `_artifacts/proposal-session-mode-model-persistence.md`

---

## 3. 方案选型过程

| 维度 | 提案 1 | 提案 2 |
|------|--------|--------|
| 思路 | 扩展 session 字段 | Composable 统一层 |
| 工作量 | 小～中 | 中 |

**用户选择：** 提案 1；调整：resolve/stamp 纯函数抽到 utils。

详见 `_artifacts/02-selection.md`。

---

## 4. 实施计划

阶段：工具与类型 → ChatPane → Workshop → 单测。见 `_artifacts/plan-session-mode-model-persistence.md`。

---

## 5. 实现说明

- 新增 `src/utils/session-preferences.ts`
- `ChatPane`：`applySessionPreferencesOnSwitch`、`stampActiveSessionPreferences`、`newChat` 默认
- `WorkshopChatSection`：切换恢复 `modelId`

详见 `_artifacts/05-implement-report.md`。

---

## 6. 单元测试执行情况

```bash
npm test -- tests/unittest/UT-session-preferences tests/unittest/UT-chat-modes-ui tests/unittest/UT-workshop-agent-link
```

**19 passed，全绿。** 全量 `npm test` 有 4 个既有失败（与本次无关）。

详见 `_artifacts/05-unittest.md`。

---

## 7. 测试报告

- 单测：resolve/stamp/newSession 边界已覆盖
- 手工建议：A/B session 切换 Mode+Model；Draw.IO 嵌入恢复；旧 session 无字段保持 UI

---

## 8. 代码审查

**结论：通过。** 见 `_artifacts/06-code-review.md`。

---

## 9. 变更清单

| 路径 | 类型 | 说明 |
|------|------|------|
| `src/utils/session-preferences.ts` | 新增 | 切换解析与发送 stamp |
| `tests/unittest/UT-session-preferences/` | 新增 | 单测 |
| `electron/main/chat-store.ts` | 修改 | modelId 字段 |
| `src/types/axecoder.d.ts` | 修改 | 类型 |
| `src/components/workbench/ChatPane.vue` | 修改 | 恢复与写入逻辑 |
| `src/components/workbench/WorkshopChatSection.vue` | 修改 | Workshop model 恢复 |

---

## 10. 遗留项与后续建议

- 修复全量套件中 `UT-agents-toggle-icon`、`UT-agent-builtin-skills` 既有失败
- `regenerateLastReply` 是否应 stamp session 偏好可后续确认

---

## 11. 附录：过程文档索引

| 文件 |
|------|
| `_artifacts/00-research-links.md` |
| `_artifacts/02-selection.md` |
| `_artifacts/proposal-session-mode-model-persistence.md` |
| `_artifacts/plan-session-mode-model-persistence.md` |
| `_artifacts/05-implement-report.md` |
| `_artifacts/05-unittest.md` |
| `_artifacts/06-code-review.md` |
