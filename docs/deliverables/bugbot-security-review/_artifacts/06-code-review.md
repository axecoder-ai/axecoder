# 代码审查 — bugbot-security-review

## 审查范围

步骤 5 全部变更，对照已确认方案与 plan。

## 功能

- [x] `bugbot` / `security-review` 注册于 `CC_BUILTIN_SUBAGENT_TYPES` 与 `SubagentType`
- [x] 只读专型 + subagent 模型档位
- [x] Cursor prompt 解析与 diff 预注入
- [x] skill 文件与 system 委派提示

## 质量

- [x] 逻辑集中在 `agent-review-diff.ts`，subagent 启动处单点调用
- [x] 7 项单测 + 全量 640 用例通过
- [x] 非 git / merge-base 失败返回可读 error，不抛未捕获异常

## 安全

- [x] 审查专型 readOnly，无 Edit/Write/Bash
- [x] git 只读命令（diff/merge-base/rev-parse），无 config/push
- [x] diff 截断防超大输出

## 非阻塞待办

1. 更新 `research-agent-tools-matrix.md` §5 AxeCoder 列为「已实现」（文档同步，非阻塞）
2. 超大 monorepo 可按文件分片审查（二期）
3. `branch changes` 在无 remote 的纯本地 repo 可加强 fallback

## 结论

**通过** — 可合并交付。
