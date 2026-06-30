# 调研来源

| 路径 / 链接 | 说明 |
|-------------|------|
| [Cursor ACP 文档](https://cursor.com/docs/cli/acp) | 官方 ACP 集成说明：`agent acp` stdio JSON-RPC |
| [Agent Client Protocol](https://agentclientprotocol.com) | 开放协议规范；stdio ndjson 传输 |
| [blowmage/cursor-agent-acp-npm](https://github.com/blowmage/cursor-agent-acp-npm) | Cursor CLI → ACP 适配器参考实现 |
| [njtian/cursor-acp](https://github.com/njtian/cursor-acp) | 社区 Cursor→ACP 桥接；工具映射模式 |
| `docs/research/research-cursor-agent-tools.md` §5 | ACP 扩展方法：`cursor/ask_question`、`cursor/create_plan` 等 |
| `docs/research/research-agent-tools-matrix.md` §15 | AxeCoder「ACP 第三方客户端」= 未实现 |
| `electron/main/agent-worker/runner.ts` | 现有 Agent Worker ndjson RPC（send/stop/confirm*） |
| `electron/main/agent-worker/protocol.ts` | Worker 行协议定义 |
| `electron/main/agent-worker-bridge.ts` | 主进程 fork Worker 桥接范式 |
| `electron/main/agent/agent-loop.ts` | Agent 主循环、工具权限、流式 progress |
| `docs/deliverables/create-plan-build-ui/` | CreatePlan 阻塞审批（对齐 Cursor ACP 扩展）先例 |

**调研缺口：**
- 仓库内尚无 `@agentclientprotocol/sdk` 依赖或 ACP 相关代码
- ACP Registry 上架流程未在本仓库验证
- AskQuestion / CreatePlan / SmartMode 阻塞工具在纯 stdio 客户端下的 UX 需明确 V1 降级策略
