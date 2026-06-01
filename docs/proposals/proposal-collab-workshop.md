## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成；用户选定提案 1）

**上下文：**
- **请求：** 在 IDE 内新增独立于 Agent Coding 的 **Collab Workshop**：多角色（技术经理 / 后端 / 前端 / 测试）轮流群聊；思考「…」动画；用户澄清挂起；文件 chip 与编辑器跳转；每轮员工发言后系统确认；与 Agent 数据隔离。
- **调研来源：** `docs/research/research-axecoder-vs-claude-code.md`（Agent 循环、`AskUserQuestion`）、`docs/research/research-ide-basics.md`（架构/IPC）、`docs/proposals/proposal-chat.md`（项目级会话持久化）。
- **上游提案：** `docs/proposals/proposal-collab-workshop.md`（make-proposals 双方案版）
- **选定基础：** **提案 1** — 独立 Workshop 域（Orchestrator + 专用存储/UI）
- **用户调整摘要：** 无额外调整；按提案 1 实施；V1 写盘仅「建议 + 跳转」，不自动 apply。

### 现状总结

- Agent 会话：`.axecoder/sessions/` + `ChatPane` + `agent-loop`。
- TitleBar 右侧有 AI / 设置按钮，可增 Workshop 入口。
- 子代理不支持 `AskUserQuestion`；Workshop 澄清走自有 `pendingQuestion`，不进 Agent store。

---

### 最终方案 – 独立 Workshop 域（Orchestrator + 专用存储/UI）

- **概述：** Main 新增 `electron/main/workshop/`（状态机、角色提示、回合调度）；持久化 `<项目>/.axecoder/workshops/`；Renderer 新增 `WorkshopPane` + TitleBar 图标；全屏占用中央工作区（与 Chat 并列入口、数据隔离）；V1 通过 `chatWithProvider` 单轮生成各角色摘要，不写盘。
- **相对选定提案的变更：** V1 明确**不自动写盘**（仅 `relatedFiles` 提示与打开文件）；Agents 侧栏暂不合并 Workshop 列表（Workshop 内自建会话列表）。
- **关键变更：**
  - `electron/main/project-axecoder-dir.ts` — `workshops` 路径辅助
  - `electron/main/workshop/workshop-types.ts`、`workshop-roles.ts`、`workshop-store.ts`、`workshop-orchestrator.ts`、`workshop-ipc.ts`
  - `electron/preload/index.ts`、`src/types/axecoder.d.ts`
  - `src/components/workbench/WorkshopPane.vue`、`TitleBar.vue`、`App.vue`
- **权衡：**
  - ✅ 与 Agent 完全隔离；编排可单测（注入 `RoleSpeaker`）。
  - ⚠️ 多角色连续模型调用 token 成本高；真多人协作留 Phase 2。
- **验证：**
  - 单测：`workshop-store`、`workshop-orchestrator`（含 `waiting_user` 恢复）。
  - 手工：TitleBar 进入 → 输入任务 → 四角色+系统确认 → 澄清 → 持久化 → Agent 不受影响。
- **待解决问题：** 自动写盘与 diff 确认、需求文档自动生成路径、Workshop 与 Agents 统一列表。

### 未采纳方案说明

- **未选：** 提案 2（顺序子代理薄编排）
- **原因：** 子代理不支持用户澄清工具，边界与 Agent 工具栈纠缠；用户选定提案 1。
