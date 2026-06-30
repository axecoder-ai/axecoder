# 调研链接 — agent-lsp-parity

- `参考实现/src/tools/LSPTool/LSPTool.ts` — 9 种 operation、校验、gitignore 过滤、格式化输出
- `参考实现/src/tools/LSPTool/prompt.ts` — 工具 description（与 CC §14 对齐）
- `参考实现/src/tools/LSPTool/formatters.ts` — 结果文本格式
- `参考实现/src/services/lsp/` — manager、LSPClient、按扩展名路由、didOpen/didChange
- `参考实现/src/services/lsp/config.ts` — 从 **插件** 加载 LSP server 配置
- `electron/main/agent/agent-ext-executor.ts` — 当前 LSP **stub**
- `electron/main/agent/agent-tool-prompts-ext.ts` — 参数名 `file_path`（与 CC `filePath` 不一致）
- `docs/deliverables/agent-tool-layer-parity/` — Wave4 曾要求 LSP 最小可调用，仍为 stub

**调研缺口：** AxeCoder 无 CC 的 plugin LSP 集成；需用 `~/.axecoder/lsp.json`（或项目级）替代配置来源。
