# 选型记录

## 2a 选型摘要

**需求：** 在 AxeCoder 实现 Cursor 对齐的 `bugbot` / `security-review` Task 子代理。

**推荐：** 提案 1 – Cursor 对齐专型 + Git Diff 预注入

## 2b 用户选择

- **选定提案：** 提案 1 – Cursor 对齐专型 + Git Diff 预注入
- **调整说明：** 无额外调整

## 对比结论

用户接受完整 Cursor 契约（diff 预注入 + skill 文件），不接受轻量仅 prompt 方案。
