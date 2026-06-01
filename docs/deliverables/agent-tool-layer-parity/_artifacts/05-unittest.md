# 单元测试执行情况

## 命令

```bash
cd /Users/cuiyunfeng/workspace/AxeCoder && npm test
```

## 完整输出

```
> axecoder@0.1.0 test
> vitest run

 RUN  v3.2.4 /Users/cuiyunfeng/workspace/AxeCoder

 Test Files  33 passed (33)
      Tests  159 passed (159)
   Duration  1.55s
```

（各文件用例均通过；新增 `UT-agent-tool-layer-parity` 6 例。）

## 统计

| 项 | 值 |
|----|-----|
| 测试文件 | 33 passed |
| 用例 | 159 passed |
| 失败 | 0 |
| **是否全绿** | **是** |

## 重点新增/更新

- `tests/unittest/UT-agent-tool-layer-parity/agent-tool-layer-parity.test.ts`
- `tests/unittest/UT-agent-tool-level-prompts/agent-tool-level-prompts.test.ts`（36 工具）
