# 单元测试执行 — ACP 第三方嵌入

## 命令

```bash
npm test -- tests/unittest/UT-acp-server/
npm test
```

## UT-acp-server 完整输出

```
 RUN  v3.2.4 /Users/cuiyunfeng/workspace/AxeCoder

 ✓ tests/unittest/UT-acp-server/acp-tool-mapper.test.ts (4 tests) 2ms
 ✓ tests/unittest/UT-acp-server/acp-app.test.ts (1 test) 10ms

 Test Files  2 passed (2)
      Tests  5 passed (5)
```

## 全量测试

```
 Test Files  1 failed | 176 passed (177)
      Tests  1 failed | 844 passed (845)
```

失败项（**与本需求无关，既有问题**）：

- `UT-agent-tool-level-prompts` — `RevertTurn` description 长度 228 < 400

## 结论

- **本需求单测：5/5 通过**
- 全量套件：1 个既有失败，非本次引入
