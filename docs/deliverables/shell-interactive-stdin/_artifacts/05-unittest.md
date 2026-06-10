# 单元测试执行情况

## 本特性专项

```bash
npm test -- tests/unittest/UT-shell-interactive-stdin/shell-interactive-stdin.test.ts
```

```
 RUN  v3.2.4 /Users/cuiyunfeng/workspace/AxeCoder

 ✓ tests/unittest/UT-shell-interactive-stdin/shell-interactive-stdin.test.ts (9 tests) 11ms

 Test Files  1 passed (1)
      Tests  9 passed (9)
```

## 全量回归

```bash
npm test
```

```
 Test Files  132 passed (132)
      Tests  626 passed (626)
```

## 结论

**全绿** — 9/9 特性用例；626/626 全量通过。
