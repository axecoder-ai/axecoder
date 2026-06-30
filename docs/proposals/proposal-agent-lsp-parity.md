# 方案提案：Agent LSP 与 同类 Agent 1:1 对齐

**状态：** 已确认

**Context:**
- **Request：** 将 同类 Agent 的 `LSP` Agent 工具能力 1:1 移植到 AxeCoder（替换当前 stub）。
- **Research sources：** `00-research-links.md`；CC `LSPTool.ts` / `services/lsp/*`。

---

## Solution Proposals

**Proposal 1 – 移植 CC LSP 运行时（推荐，最接近 1:1）**

- **Overview：** 在 Electron 主进程引入 `vscode-languageserver` / `vscode-languageserver-protocol` / `vscode-languageserver-types`，按 CC 结构实现 `lsp-manager`、`lsp-client`、`agent-lsp-executor`、`agent-lsp-formatters`；工具 schema 与 CC 一致（`filePath`、`line`、`character`、9 个 `operation`）；应用启动时异步初始化 manager；`agentFeatureLsp` 默认改为 true（或保持 false 但实现完整）。
- **Key changes：**
  - 新增 `electron/main/lsp/*`（从 CC 精简移植，去掉 plugin 依赖）
  - 配置：`~/.axecoder/lsp.json` + 可选 `.axecoder/lsp.json`（`command`、`args`、`extensionToLanguage`）
  - 替换 `agent-ext-executor.ts` 中 LSP stub；更新 `agent-tool-prompts-ext.ts` 参数与 `prompt.ts` 文案
  - 单测：mock LSP 响应或集成 `typescript-language-server`（若环境已安装）
- **Trade-offs：**
  - 优点：与 CC 行为、输出格式、错误文案一致；Agent 可真正 jump-to-def / refs / hover
  - 缺点：依赖体积、需用户本机安装 language server；无 CC 插件生态时需自维护 lsp.json 示例
- **Validation：** Vitest 覆盖 operation→method 映射、1-based→0-based 坐标、gitignore 过滤；手工对 `electron/main/agent/*.ts` 跑 goToDefinition/findReferences
- **Open questions：** 是否在设置页提供 LSP 配置编辑；Monaco 编辑器是否复用同一 manager（二期）

**Proposal 2 – 分阶段：先 TS/JS 单语言服务器**

- **Overview：** 仅 spawn `typescript-language-server`（或 `vtsls`），实现 4 个高频 operation（goToDefinition、findReferences、hover、documentSymbol）；其余 5 个 operation 返回「未支持」；后续再扩语言与 CC 全量 parity。
- **Key changes：** 单文件 `agent-lsp-ts.ts` + 最小 JSON-RPC 客户端，不引入完整 manager 抽象。
- **Trade-offs：**
  - 优点：改动面小、更快可演示
  - 缺点：**非 1:1**（缺 workspaceSymbol、call hierarchy、gitignore 过滤、CC 格式化）
- **Validation：** 仅 TS 文件单测 + 手工验证
- **Open questions：** 用户要求 1:1 时本方案需明确标注为「阶段性」

---

## Notes

- CC 的 LSP 仅在 `isLspConnected()` 时启用工具；AxeCoder 应对齐：`agentFeatureLsp` + manager 初始化成功。
- 参数命名：当前 AxeCoder 为 `file_path`，1:1 应改为 **`filePath`**（与 CC API 一致），并在 executor 做别名兼容一期。
