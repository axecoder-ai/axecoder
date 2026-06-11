# 单元测试执行记录

## 命令

```bash
npm test
```

## 结果

- **状态：全绿**
- **文件数：** 137
- **用例数：** 656（含新增 3 条 `UT-llm-compact`）

## 新增用例

- `LLM 摘要成功时 usedLlm 为 true 且摘要写入占位`
- `LLM 失败时回退规则摘要`
- `serializeMessagesForCompact 截断过长 tool 内容`

## 完整输出（摘要）

```
Test Files  137 passed (137)
     Tests  656 passed (656)
  Duration  7.82s
```
