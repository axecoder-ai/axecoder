# 代码审查

## 结论

**通过**（无阻塞项）

## 功能

- 满足用户调整：无 MCP、无外部 HTTP 服务、代码移植至 `electron/main/draw-io/`
- Draw.IO 模式位置与 Workshop 嵌入行为与方案一致

## 质量

- 模式锁定规则已扩展单测
- draw-io 工具与 XML 编辑有单元覆盖

## 非阻塞待办

1. 离线 draw.io 自建实例（`DRAWIO_BASE_URL`）后续支持
2. `get_shape_library` / VLM 校验可二期补齐
3. 手工验证：选 Draw.IO → 输入「画登录流程图」→ 画布更新

## 安全

- iframe 仅加载 embed.diagrams.net；postMessage 校验 origin
