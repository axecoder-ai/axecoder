# 单元测试执行情况

## 本轮相关测试命令

```bash
npm test -- tests/unittest/UT-ai-provider-abstraction \
  tests/unittest/UT-models-settings/ai-providers.test.ts \
  tests/unittest/UT-codex-provider \
  tests/unittest/UT-openai-messages/chat-with-tools-reasoning.test.ts \
  tests/unittest/UT-model-settings/models-ping.test.ts \
  tests/unittest/UT-workshop-chat-align/workshop-llm.test.ts
```

## 结果摘要

| 指标 | 值 |
|------|-----|
| 测试文件 | 9 passed (9) |
| 用例 | **27 passed (27)** |
| 是否全绿 | **是（本轮范围）** |

## 全量套件说明

```bash
npm test
```

- 571 passed / 573 total
- 2 failed（**与本轮无关的既有失败**）：
  - `UT-agent-tool-level-prompts` — 工具数量 40 vs 42
  - `UT-agent-os-sandbox/bash-integration` — execpolicy deny 路径

## 完整输出

见同目录 `05-unittest-raw.txt`。
