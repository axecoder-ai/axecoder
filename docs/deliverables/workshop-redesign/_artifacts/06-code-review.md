# 代码审查

**结论：** 通过（无阻塞项）

## 功能对照

| 需求 | 状态 |
|------|------|
| 取代拆步/验收 | ✅ turn orchestrator |
| AI 选接话人 / 路由话语权 | ✅ workshop-router |
| 经理派活即执行 | ✅ runManagerSpeak 直跳成员 |
| BOSS 仅澄清暂停 | ✅ waiting_user |
| BOSS profile 身份 | ✅ WorkshopChatSection |
| 共用 ChatPane | ✅ sessionKind + WorkshopChatSection |
| API role 映射 | ✅ workshopApiRole |
| no_legacy | ✅ stripLegacyWorkshopFields |

## 质量

- 编排逻辑集中在 `workshop-turn-orchestrator.ts`，router 解析可单测。
- Facade 层薄，符合提案 2。
- IPC 向后兼容 `startRun`/`sendUserAnswer`。

## 非阻塞待办

1. 删除未使用的 `WorkshopPane.vue`（可选清理）。
2. 路由 LLM 失败时可加重试或 fallback 选角。
3. `workshop-plan-parse.ts` 可标记 deprecated 后移除。

## 安全

- 无新增外部输入面；用户 ID 校验在 router parse 中。
