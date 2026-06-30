# 单元测试

## 命令

```bash
npm test -- tests/unittest/UT-git-forge tests/unittest/UT-git-agent-tools
npm test   # 全量 854 passed
```

## 本轮新增/扩展

- `UT-git-forge/git-forge-ci.test.ts` — CI prompt、gh run 只读
- `UT-git-agent-tools/git-agent-tools.test.ts` — GitStatus/GitDiff/GitLog 临时仓库

## 结果

- **全量：854 / 854 通过**
- 本轮相关：20 passed（git-forge 17 + git-agent-tools 3）

## 失败项

无（全绿）
