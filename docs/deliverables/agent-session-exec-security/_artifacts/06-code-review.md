# 代码审查

## 结论

**通过**（无阻塞项）

## 功能

| 项 | 状态 |
|----|------|
| Checkpoint + `/rewind` | ✅ |
| `/resume` `/export` `/init` `/memory` | ✅ |
| 并行 tool calls | ✅（既有 + 文档） |
| 子代理 UI / TaskOutput | ✅ |
| Ollama tools | ✅（兼容 API） |

## 非阻塞待办

- Checkpoint 持久化到磁盘（跨重启）
- `/export` 可选写入 `.axecoder/exports/` 文件
- 子代理任务面板在对话结束后仍保留（当前随 progress UI 清理）

## 安全

- `memory.md` / `AGENTS.md` 路径固定或项目内，无任意路径写盘。
