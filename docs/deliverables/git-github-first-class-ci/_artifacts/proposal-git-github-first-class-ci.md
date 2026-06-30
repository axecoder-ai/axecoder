## 已确认解决方案提案

**状态：** 已确认（由 `/create-proposals` 生成）

**上下文：**
- **请求：** Git/GitHub 一等公民；CI 仍靠 Bash + git-forge 注入。
- **调研来源：** `docs/deliverables/git-github-first-class-ci/_artifacts/00-research-links.md`
- **选定基础：** 提案 2 – Git 只读原生工具 + Bash CI
- **用户调整摘要：** 无额外调整，按方案全文落地

---

### 最终方案 – Git 只读原生工具 + Bash CI

- **概述：** 新增只读 GitStatus/GitDiff/GitLog Agent 工具；扩展 git-forge CI prompt、gh CI 只读白名单、子代理 forge 注入、`/investigate-ci` 斜杠；CI/PR 远程操作仍 exclusively Bash + forgeEnvForBash。
- **关键变更：** 见 `docs/plans/plan-git-github-first-class-ci.md`
- **权衡：** 改动面中等；Git 工具与 Bash git 分工需在 BASH_DESCRIPTION 写清。
- **验证：** UT-git-forge + UT-git-agent-tools + agent-system-prompt 单测全绿。
- **待解决问题：** Gitee Actions 日志 API 需用户手工验证。
