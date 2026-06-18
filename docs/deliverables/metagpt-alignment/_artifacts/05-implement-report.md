# 功能实现报告 — metagpt-alignment

## 功能说明

对齐 MetaGPT 核心能力（提案 2）：

1. **`electron/main/sop/`** — SOP 类型、PRD/Design/Tasks schema、Message Pool、阶段闸门、流水线引擎、QA 闭环、rppit phase 映射。
2. **`software-company` ChatMode** — 固定流水线 PRD → Design → Tasks → Implement → QA → Done；与 Multi-Agent / Reflection 并列。
3. **Workshop 集成** — `workshop-ipc` 分支、`WorkshopSopProgress` 阶段条、`qa_engineer` 内置角色。
4. **交付物** — 各阶段 artifact 落盘 `docs/deliverables/{slug}/_artifacts/sop-*.json|md`。

## 修改文件列表

| 路径 | 说明 |
|------|------|
| `electron/main/sop/*` | 新建 SOP 模块（8 文件） |
| `electron/main/workshop/workshop-types.ts` | causeBy、sopPhase、sopPoolMessages |
| `electron/main/workshop-ipc.ts` | software-company 编排分支 |
| `electron/main/builtin-workflow-roles.ts` | QA Engineer |
| `electron/main/users-types.ts` | qa_engineer 角色 |
| `electron/main/agent/chat-mode.ts` | software-company 模式 |
| `electron/main/agent/rppit-axecoder-addon.ts` | rppit↔SOP 映射提示 |
| `src/utils/chat-modes.ts` | UI 模式选项 |
| `src/types/axecoder.d.ts` | 前端类型 |
| `src/components/workbench/WorkshopSopProgress.vue` | 阶段条 |
| `src/components/workbench/WorkshopChatSection.vue` | 嵌入阶段条 |
| `src/components/workbench/ChatPane.vue` | software-company 嵌入 Workshop |
| `tests/unittest/UT-sop-*` | 3 套新单测 |

## 单测覆盖

- Message Pool 订阅隔离
- QA 闭环 3 轮逻辑
- SOP pipeline 端到端（scripted）+ artifact 落盘
- UT-collab-workshop / UT-coordinator-multi-agent 回归

## 注意事项

- 真实环境 QA 跑测依赖项目 test 命令；默认由 QA 角色 Agent 输出判定。
- Message Pool 序列化在 `WorkshopSession.sopPoolMessages`，会话恢复可续跑。
- 自定义 SOP 编辑器、MetaGPT Python 互操作未在本轮实现。
