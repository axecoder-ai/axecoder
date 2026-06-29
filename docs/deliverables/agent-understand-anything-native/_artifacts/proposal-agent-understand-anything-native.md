# 方案提案：原生集成 Understand-Anything 知识图谱

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** 在 AxeCoder 主进程原生集成 Understand-Anything，新增独立 **Understand** Chat 模式（Workshop 左聊右图），Agent 可直接利用 `.understand-anything/knowledge-graph.json`。
- **调研来源：** `docs/deliverables/agent-understand-anything-native/_artifacts/00-research-links.md`
- **选定基础：** 提案 1 – Understand 独立模式 + 运行时读图谱层
- **用户调整：** （1）UA 必须为单独 Chat 模式；（2）右侧面板首版 WebView 嵌入 UA Dashboard；（3）无其他调整

---

### 最终方案 – Understand 独立模式 + 运行时读图谱层

- **概述：** 新增 `understand` Chat 模式（Workshop 嵌入）：左侧对话做代码库语义问答，右侧 WebView 加载本地 Dashboard 静态服务。主进程薄封装层读取 `.understand-anything/knowledge-graph.json`，提供 **UnderstandSearch / UnderstandContext / UnderstandExplain / UnderstandDiff** 工具；图谱生成仍通过内置 `/understand` Skill。与 CodeGraph **并存**：Agent 模式用 CodeGraph 符号索引，Understand 模式用 UA 语义图谱。
- **关键变更：**
  - Chat 模式：`understand` 加入 `ChatModeId`、UI 选项、`isWorkshopEmbeddedChatMode`
  - `electron/main/understand-anything/`：manager（loadGraph + Fuse 搜索 + context 格式化）
  - `understand-turn.ts` + workshop-ipc 路由
  - Agent 工具 + `agentFeatureUnderstandAnything`（默认 true）
  - IPC + 本地 HTTP 服务 Dashboard WebView
  - 内置 Skill：`resources/builtin-skills/understand/`
- **权衡：** 首版不实现自动 tree-sitter 索引；Dashboard 需构建静态 dist 或显示占位引导
- **验证：** Vitest manager 单测；`npm test` 全绿

### 未采纳方案

- **提案 2** 完整引擎 vendoring：工作量大，二期
- **提案 3** 替换 CodeGraph：迁移风险高
