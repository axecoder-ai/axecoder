# 已确认解决方案提案：Reflection 反思模式

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 恢复并完善 Reflection 聊天模式，实现 Developer↔Reviewer 1～3 轮反思循环，Tech Lead 短评收尾，复用 Workshop 面板，与 Multi-Agent 互斥。
- **调研来源：** `docs/prd/reflection-mode-prd.md`；`electron/main/coordinator/coordinator-turn-engine.ts`；`src/components/workbench/ChatPane.vue`
- **上游提案：** `docs/proposals/proposal-reflection-mode.md`（双方案草稿）
- **选定基础：** 提案 1 – 独立 Reflection 编排器 + 复用 Multi-Agent 骨架
- **用户调整摘要：** 无额外调整，按 PRD 原样实现

---

### 最终方案 – 独立 Reflection 编排器 + 复用 Multi-Agent 骨架

- **概述：** 从 `DISABLED_CHAT_MODES` 开放 `reflection`；将 ChatPane Multi-Agent Workshop 嵌入逻辑泛化为支持 reflection；新建 `reflection-turn-orchestrator.ts` 实现固定 Dev→TL→Reviewer→TL 循环（最多 3 轮）；`workshop-ipc.runSend` 按 `chatMode` 分支。Tech Lead 插话与收尾使用纯 LLM 文本，不调用工具。

- **相对选定提案的变更：** 无（用户确认按 PRD 原样）

- **关键变更：**
  - `src/utils/chat-modes.ts`：移除 reflection 禁用；加 CHAT_MODE_OPTIONS；扩展 `canPickChatMode`
  - `electron/main/agent/chat-mode.ts`：同步开放；更新 system addon
  - `src/components/workbench/ChatPane.vue`：泛化 `isWorkshopInAgentChat`；send/sync/watch/模式锁定
  - **新建** `electron/main/workshop/reflection-turn-orchestrator.ts`
  - `electron/main/workshop-ipc.ts`：`chatMode` 分支
  - `src/composables/useWorkbenchSession.ts`、`electron/preload/index.ts`、`src/types/axecoder.d.ts`：透传 `chatMode`
  - 复用 `buildAgentRoleSpeaker`、`emitWorkshopProgress`、`workshop-agent-link`（`ma-{chatId}`）

- **权衡：**
  - ✅ 与 Multi-Agent 自由路由解耦，流程可控可测
  - ✅ 最大化复用 Workshop IPC/UI/流式基础设施
  - ⚠️ Tech Lead 需单独纯文字发言函数
  - ⚠️ 3 轮循环增加 token 与耗时（TL 支持提前收尾）

- **验证：**
  - `tests/unittest/UT-reflection-orchestrator/reflection-turn-orchestrator.test.ts`
  - 扩展 `tests/unittest/UT-chat-mode-lock/chat-mode-lock.test.ts`
  - PRD 验收标准 AC-01～AC-12

- **待解决问题：**
  - Tech Lead 继续/收尾判断用结构化 JSON（`{ continue: boolean, comment: string }`）
  - SwitchMode 支持 reflection 本期不做

### 未采纳方案说明

- **未选：** 提案 2 – Coordinator 内脚本化路由
- **原因：** 增加 Coordinator 复杂度；`runManagerSpeak` 工具调用与 PRD「Tech Lead 纯文字」冲突；维护与回归风险更高
