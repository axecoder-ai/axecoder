# 代码审查 – collab-manager-step-verify

## 结论

**通过**（无阻塞项）

## 功能

- 满足「经理拆步 → 按 users.json 派活 → 逐步执行 → 经理验收 / redo」闭环。
- UI 步骤条与 `speakerUserId` 展示符合选型调整。

## 质量

- 编排逻辑集中在 `workshop-orchestrator.ts`，解析独立为 `workshop-plan-parse.ts`，可单测。
- 保留 `nextEmployeePhase` 与旧 phase 枚举以兼容历史会话字段。

## 安全

- assigneeUserId 白名单校验；经理不可作为执行人。

## 非阻塞待办

1. 步骤条可增加「验收中」状态文案（当前靠 phase 推断）。
2. 经理计划 JSON 解析失败时可自动重试一次 LLM（现以 system 气泡报错结束）。
3. `parseWorkshopStreamId` 对多段 `-` 的 workshopId 仍脆弱，已用 `parseWorkshopStreamRole` 前缀匹配缓解。
