# 代码审查：model-dual-api-id

## 结论

**通过**（无阻塞项）

## 功能对照

| 需求 | 状态 |
|------|------|
| 单条目双 API ID 配置 | ✓ |
| 主会话按问题复杂度 auto | ✓ |
| 子任务 fast API | ✓ |
| 废弃全局快速模型下拉 | ✓ |
| 旧数据迁移 | ✓ |

## 非阻塞待办

- 工坊/Chat 非 tester 角色是否也要 auto（当前 manager/backend 仍可用 auto 于 LLM speaker 的 user 文本）
- V2：可选 LLM 分类器

## 安全

- 无新增密钥存储；仍走 `secrets-store`。
