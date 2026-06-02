# 选型记录 – collab-manager-step-verify

## 2a 选型摘要

### 一句话需求回顾

协作 Workshop 启动后，技术经理先按 `~/.aex-coder/users.json` 中的用户拆出可执行步骤；再逐步由对应 Agent 执行；每步完成后经理验收，决定下一步、下一执行人或要求重做。

### 方案对比表

| 维度 | 提案 1 动态步骤计划 + 验收状态机 | 提案 2 四套角色 + 验收门闩 |
|------|----------------------------------|----------------------------|
| 核心思路 | 结构化步骤表 + userId 绑定 | 固定 manager→backend→frontend→tester + 经理自然语言验收 |
| 主要改动范围 | types、plan-parse、orchestrator、user-bind、UI 步骤条 | orchestrator、user-bind 模糊匹配、prompt |
| 优点 | 支持架构师等任意 users.json 角色；验收可 redo | 改动小、与现有类型兼容 |
| 缺点 / 风险 | JSON 解析与双次经理 LLM | 无法满足「角色必须在 user.json」的完整语义 |
| 工作量 | 中 | 小 |
| 适合场景 | 真实团队角色多样、需严格按人派活 | 仅四套研发角色、快速加验收 |

### 关键差异

- 提案 1 以 **userId** 为执行人主键；提案 2 仍以 **backend/frontend/tester** 枚举为主。
- 提案 1 经理输出 **JSON 步骤表**；提案 2 依赖自然语言解析「重做后端」。
- 用户配置含「系统架构师」时，仅提案 1 可直接派活。
- 两方案均可加经理验收；提案 1 的 `approve|redo` 更可测。
- V1 写盘与 agent-loop 复用方式两方案相同。

### 推荐

**推荐：提案 1 – 动态步骤计划 + 经理验收状态机**

理由：与用户需求及现有 `users.json`（前端工程师、后端工程师、系统架构师）一致；`workshop-user-bind` 当前硬编码「后端/前端/测试」已不匹配真实配置。

### 选型提示

下一步通过选择题确认；完整提案见 `docs/proposals/proposal-collab-manager-step-verify.md`。

---

## 2b 用户最终选择

- **选定提案：** 提案 1 – 动态步骤计划 + 经理验收状态机
- **调整说明：** V1 需在 Workshop UI 展示步骤进度条/当前步骤

## 2c 落盘

本文档即 2c 选型记录。
