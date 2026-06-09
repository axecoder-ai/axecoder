# 功能实现报告 — agent-progress-detail

## 功能说明

Agent 执行进度流中，每个 **Model Result** 步骤展示 reasoning/content/tool_calls 摘要；每个 **Tool** 步骤完成后展示工具返回正文（stdout、读文件内容等），默认截断 4000 字符。

## 修改文件

| 文件 | 说明 |
|------|------|
| `electron/main/agent/agent-progress-detail.ts` | 新增格式化 |
| `electron/main/agent/agent-loop.ts` | emit detail |
| `src/utils/agent-progress.ts` | 类型 + apply |
| `src/types/axecoder.d.ts` | IPC 类型 |
| `src/components/workbench/AgentProgressStream.vue` | UI 展示 |
| `tests/unittest/UT-agent-progress/*` | 单测 |

## 注意事项

- 流式 `content_delta`/`thinking_delta` 仍保留；done 时 detail 为完整快照。
- Workshop 共用 `AgentProgressStream`，自动受益。
