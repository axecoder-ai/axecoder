# 方案选型记录

**任务：** workshop-redesign  
**日期：** 2026-06-03

---

## 一句话需求回顾

完全重做 Workshop 群聊：AI 路由接话人与话语权，技术经理代 BOSS 派活，BOSS 仅在 AskUserQuestion 澄清时介入；与 Agent 共用 ChatPane；取代拆步/验收模式。

---

## 方案对比表

| 维度 | 提案 1 轻量路由 + ChatPane 分支 | 提案 2 统一消息 Facade |
|------|--------------------------------|------------------------|
| 核心思路 | 新 turn orchestrator + ChatPane kind 分支 | 同后端 + useWorkbenchSession Facade |
| 主要改动范围 | orchestrator、router、ChatPane 分支 | 提案 1 + composable、adapter、preload |
| 优点 | 改动小、风险低、快落地 | 前端结构清晰、长期可维护 |
| 缺点 / 风险 | ChatPane 膨胀 | 工作量大、schema 设计风险 |
| 工作量 | 中 | 中大 |
| 适合场景 | 优先跑通逻辑 | 换长期架构质量 |

---

## 关键差异说明

- 提案 1：ChatPane 内直接分支两套 IPC/消息类型。
- 提案 2：Facade 统一 load/send/渲染，ChatPane 只消费 WorkbenchSessionView。
- 后端编排两者相同：新 router + turn loop，废弃 plan/verify/redo。
- 需求强调简化实现，但用户选定提案 2 换取前端长期结构。

---

## 推荐方案

**推荐：提案 1** — 最小改动、最快替换失败的后端编排。

---

## 用户最终选择

- **选定：提案 2 – 统一消息模型 + 会话 Facade**
- **调整说明：不兼容旧 Workshop 会话，直接清空 stepPlan 相关字段（no_legacy）**

---

## 2b 确认

通过 AskQuestion 确认：提案 2 + no_legacy。
