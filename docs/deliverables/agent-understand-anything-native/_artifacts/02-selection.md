# 方案选型记录

## 2a 选型摘要（初版）

### 一句话需求回顾

在 AxeCoder 主进程原生集成 Understand-Anything，使 Agent 能直接利用 `.understand-anything/knowledge-graph.json` 做架构理解与问答，而非仅依赖 Cursor 插件 Skill 软链。

### 方案对比表

| 维度 | 提案 1 Understand 独立模式 + 读图谱 | 提案 2 完整引擎 vendoring | 提案 3 统一替换 CodeGraph |
|------|-------------------------------------|---------------------------|---------------------------|
| 核心思路 | 新 Chat 模式 + UA 工具读已有 JSON | 仿 CodeGraph 全量 vendoring + 自动结构索引 | 废弃 CodeGraph，单引擎 |
| 主要改动范围 | chat-mode、Workshop UI、understand-anything/、Agent 工具 | 提案 1 + TreeSitter 索引 + WASM 打包 | 迁移 .codegraph → .understand-anything |
| 优点 | UX 清晰、交付快、与 CodeGraph 并存 | 开箱自动索引 | 架构最简 |
| 缺点 / 风险 | 首用需 /understand；Dashboard 嵌入 | 工作量大、双引擎维护 | 破坏已有 CodeGraph 数据 |
| 工作量 | 中 | 大 | 大 |
| 适合场景 | 语义理解、 onboarding、架构问答 | 希望零配置结构图谱 | 长期只保留 UA |

### 关键差异

- 提案 1 把 UA 做成**独立 Chat 模式**（用户明确要求），Agent 模式继续用 CodeGraph
- 提案 2 在提案 1 基础上加主进程自动 tree-sitter 索引，无需先跑 Skill
- 提案 3 合并双引擎，迁移成本高，不推荐首版

### 推荐方案

**推荐：提案 1 – Understand 独立模式 + 运行时读图谱层**

理由：用户希望 UA 为单独模式；与已有 CodeGraph 集成不冲突；Workshop 模式先例成熟（Draw.IO / Software Co.）；首版聚焦读图谱 + Dashboard 嵌入，验证价值后再考虑自动索引。

### 选型提示

用户首轮反馈：「UA 能做成一个单独的模式吗？」——已纳入提案 1 修订。

---

## 2b 用户确认（待二次确认）

- **用户原话：** UA 能做成一个单独的模式吗？
- **调整说明：** 无额外调整（用户选择 none）
- **解读：** 要求在方案中必须包含独立 `understand` Chat/Workshop 模式，而非仅在 Agent 模式附加工具

---

## 2b 用户最终确认

- **选定提案：** 提案 1 – Understand 独立模式 + 读图谱层
- **Dashboard：** 右侧 WebView 嵌入 UA Dashboard（完整交互）
- **调整说明：** 无额外调整
