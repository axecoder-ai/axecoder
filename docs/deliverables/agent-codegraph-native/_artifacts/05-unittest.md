# 单元测试执行情况

## 命令

```bash
npm run codegraph:build && npm test
```

## 结果摘要

| 指标 | 值 |
|------|-----|
| 测试文件 | 82 passed |
| 用例 | 353 passed |
| 失败 | 0 |
| 是否全绿 | **是** |

## 新增用例

`tests/unittest/UT-agent-codegraph-native/agent-codegraph-native.test.ts`

- buildExtendedAgentTools 含 CodeGraph 三工具
- isCodeGraphAgentTool 识别
- getCodeGraphInstructionsSection 未索引提示
- integration：init + CodeGraphSearch（greetUser fixture）
- integration：CodeGraphExplore（pickMagic fixture）

## 完整终端输出（节选）

```
> axecoder@0.1.0 codegraph:build
> tsc -p electron/main/codegraph/tsconfig.json && node electron/main/codegraph/copy-assets.mjs

codegraph assets copied to dist/

> axecoder@0.1.0 test
> vitest run

 ✓ tests/unittest/UT-agent-codegraph-native/agent-codegraph-native.test.ts (5 tests) 519ms
 ...
 Test Files  82 passed (82)
      Tests  353 passed (353)
   Duration  ~5s
```

## 修复的既有用例

- `UT-agent-tool-level-prompts`：工具总数 37 → 40（新增 CodeGraph 三工具）
