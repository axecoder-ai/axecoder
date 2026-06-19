# 选型记录

## 2a 选型摘要

**需求：** 将 next-ai-draw-io 画图能力接入 AxeCoder；新增 Draw.IO 模式（Plan 与 Multi-Agent 之间）。

| 维度 | 提案 1 MCP + Agent 分栏 | 提案 2 Workshop 嵌入 |
|------|-------------------------|----------------------|
| 核心思路 | MCP + Agent 分栏 | Workshop 嵌入 + 专用工作区 |
| 改动面 | 中 | 大 |
| 推荐 | ✅ 推荐（默认） | 用户选定 |

**推荐方案：** 提案 1 – MCP 内置插件 + Agent 分栏画布

## 2b 用户最终选择

- **选定提案：** 提案 2 – Workshop 嵌入编排 + 专用 Draw.IO 工作区
- **调整说明（重要）：**
  1. **把代码拷贝过来，在系统内实现功能**（不依赖 npx 远程 MCP 包）
  2. **不要做外部服务**（不单独起 MCP HTTP 服务、不弹外部浏览器）
  3. **不要 MCP**（不走 CallMcpTool / mcp.json 配置路径）

## 2c 落地解读

最终方案 = **提案 2 的 Workshop UX 与模式位** + **提案 1 的去 MCP 化**：将 `next-ai-draw-io` 中 draw.io 嵌入、XML 操作、AI 生成图表等核心逻辑**移植进 AxeCoder 主进程/渲染进程**，以 Workshop 嵌入模式呈现，Agent 通过**内置工具**（非 MCP）操作图表。
