# 已确认解决方案提案：/design 斜杠命令

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** `/design` 斜杠命令 + 项目有 DESIGN.md 时前端样式约束
- **调研来源：** `src/slash-commands/builtin.ts`、`electron/main/agent-ipc.ts`、`design/*/DESIGN.md`
- **选定基础：** 提案 1 – Main IPC 集中 + builtin 注册
- **用户调整摘要：** 无

---

### 最终方案 – Main IPC + Agent 动态注入

- **概述：** `electron/main/design/design-slash.ts` 实现列库、复制、配色展示；`agent:designSlash` IPC；`builtin.ts` 注册 `/design`；`buildAgentSystemPrompt` 在存在 `DESIGN.md` 时注入设计规范段（含 colors 摘要）。
- **关键变更：**
  - `electron/main/design/design-slash.ts`
  - `electron/main/agent-ipc.ts`、`preload`、`axecoder.d.ts`
  - `src/slash-commands/builtin.ts`
  - `electron/main/agent/agent-system-prompt.ts`
  - `tests/unittest/UT-design-slash/`
- **行为：**
  1. 有 `DESIGN.md` → 展示配色 + 提示删除可取消
  2. 无 `DESIGN.md` 无参 → 列出 `APP_ROOT/design/` 下主题目录名
  3. 无 `DESIGN.md` 有参 → 复制 `design/<arg>/DESIGN.md` 到项目根
- **验证：** vitest + 手工 `/design`、`/design cursor`
