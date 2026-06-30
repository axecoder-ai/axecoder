# 方案选型记录

## 一句话需求回顾

AxeCoder 需移植 同类 Agent 的 GitHub 集成（Bash+gh PR 工作流、只读 gh 自动放行、环境感知），并扩展 Gitee 与用户自配 Git 托管地址；**不做** `/install-github-app` 类 Anthropic OAuth 向导。

## 方案对比表

| 维度 | 提案 1 Git Forge 抽象层 | 提案 2 Bash/Prompt 轻量对齐 |
|------|---------------------------|------------------------------|
| 核心思路 | 统一 forge provider + 设置 + Agent 全链路 | 仅 prompt + gh 只读 + 最小设置字段 |
| 主要改动范围 | `git-forge/`、设置 UI、Bash 权限、斜杠命令、env | agent-tool-prompts、agent-bash-readonly、GeneralTab 两行 |
| 优点 | GitHub 1:1 + Gitee/自建结构化支持 | 改动小、上线快 |
| 缺点 / 风险 | 工作量大；Gitee 无 gh 需 REST/模板 | Gitee 体验不稳定；无 PR 会话关联 |
| 工作量 | 大 | 小 |
| 适合场景 | 长期产品化、多 forge | 快速验证 GitHub prompt |

## 关键差异

- 选 1 会得到 forge 检测、设置卡片、Gitee API 指引、PR URL 解析与会话关联。
- 选 2 仅靠 prompt 教模型用 curl，无 provider 层。
- Gitee 与自配 host 在提案 1 中有结构化配置；提案 2 依赖用户 export 环境变量。
- 两者均跳过 Anthropic GitHub App 安装向导。

## 推荐方案

**推荐：提案 1 – Git Forge 抽象层**

理由：用户明确要求 Gitee 与自配地址，且要求 GitHub 1:1；提案 2 无法稳定覆盖 Gitee/自建。跳过 install-app 可在提案 1 内收窄范围，仍保留 Agent PR 工作流与设置。

## 用户最终选择

- **选定提案：** 提案 1 – Git Forge 抽象层（GitHub 1:1 + Gitee + 自配 Host）
- **调整说明：** 跳过 `/install-github-app` 类向导，仅做 Agent PR 工作流 + 设置
