# 代码审查

## 范围

对照已确认方案 `proposal-git-host-integration.md` 与 `plan-git-host-integration.md`，审查 git-forge 模块、Agent 集成、设置 UI、斜杠命令与单测。

## 功能

| 项 | 结论 |
|----|------|
| GitHub PR 工作流 prompt（gh） | ✅ 对齐 CC BashTool 主流程 |
| gh 只读自动放行 | ✅ |
| Gitee API 模板 + token | ✅ |
| 自配 web/api base | ✅ |
| 跳过 install-github-app | ✅ 未实现 OAuth 向导 |
| PR URL 会话关联 | ✅ 内存 `linkedPrUrl`（未持久化到 chat JSON） |

## 质量

- 模块边界清晰：`git-forge/` 与 agent 层解耦。
- Bash env 通过 `envOverride` 传入，未污染全局 `process.env`（git-ipc 已修正）。
- 单测覆盖 remote 解析、forge kind、只读 bash、PR URL 提取。

## 安全

- ⚠️ **非阻塞**：`gitForgeAccessToken` 明文存 config；文档已注明，建议后续 keytar。
- gh 只读白名单为前缀匹配，未移植 CC 完整 flag 校验；恶意 `gh pr view; rm -rf` 仍会被用户批准流拦截（非只读）。

## 阻塞项

无。

## 非阻塞待办

1. Chat 会话 JSON 持久化 `linkedPrUrl` 并在 UI 展示可点击链接。
2. 移植 CC `readOnlyCommandValidation` 完整 flag 校验。
3. Gitee 专用 IPC 封装（非 curl 模板）。
4. Token keytar 存储。

## 审查结论

**通过** — 满足本轮需求与选型调整；可合并交付。
