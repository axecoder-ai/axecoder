import type { GitForgeContext } from './forge-types'

const GIT_SAFETY = `# Git Safety Protocol

- NEVER update the git config
- NEVER run destructive/irreversible git commands (like push --force, hard reset, etc) unless the user explicitly requests them
- NEVER skip hooks (--no-verify, --no-gpg-sign, etc) unless the user explicitly requests it
- NEVER run force push to main/master, warn the user if they request it
- Avoid git commit --amend unless conditions in user rules are met
- NEVER commit changes unless the user explicitly asks you to commit
- Do not commit files that likely contain secrets (.env, credentials.json, etc)
- Never use git commands with the -i flag (like git rebase -i or git add -i) since they require interactive input`

const githubPrSection = (baseBranch: string) => `# Creating pull requests (GitHub)

Use the \`gh\` command via Bash for ALL GitHub-related tasks (issues, pull requests, checks, releases). Prefer \`gh\` over WebFetch for GitHub URLs.

When the user asks you to create a pull request:

1. Run in parallel: \`git status\`, \`git diff\`, check upstream tracking, \`git log\`, \`git diff ${baseBranch}...HEAD\`
2. Analyze ALL commits on the branch (not just the latest)
3. Push with \`-u\` if needed
4. Create or update PR with \`gh pr create\` or \`gh pr edit\` (HEREDOC for body)
5. Return the PR URL when done

Example:
\`\`\`bash
gh pr create --title "Short title" --body "$(cat <<'EOF'
## Summary
- ...

## Test plan
- [ ] ...
EOF
)"
\`\`\`

Read-only inspection (auto-approved): \`gh pr view\`, \`gh pr list\`, \`gh pr diff\`, \`gh pr checks\`, \`gh pr status\`, \`gh issue view\`, \`gh issue list\`, \`gh run view\`, \`gh run list\`, \`gh workflow view\`, \`gh workflow list\`.`

const githubCiSection = () => `# Investigating CI failures (GitHub)

Use \`gh\` via Bash (forge env injects GH_HOST/GH_TOKEN). Prefer read-only commands — they auto-execute without approval.

Workflow:
1. \`gh pr checks\` or \`gh pr view --json statusCheckRollup\` for the PR
2. \`gh run list --branch <branch> --limit 5\` to find failed workflow runs
3. \`gh run view <run-id> --log-failed\` for failure logs
4. Cross-check with local \`GitStatus\` / \`GitDiff\` / \`GitLog\` tools for repo state

Return: failing check name, root cause, and a minimal fix suggestion.`

const giteeCiSection = (repoSlug: string, apiBase: string) => `# Investigating CI failures (Gitee)

Gitee has no \`gh\` CLI. Use \`curl\` with \`$GITEE_TOKEN\` against ${apiBase} for pipeline status when needed.
Repository: ${repoSlug}
Prefer local \`GitStatus\` / \`GitDiff\` / \`GitLog\` for working tree context.`

const giteePrSection = (baseBranch: string, repoSlug: string, apiBase: string) => `# Creating pull requests (Gitee)

Gitee has no \`gh\` CLI. Use \`git\` for local operations and \`curl\` against Gitee API v5 (\`$GITEE_TOKEN\` from settings).

Repository: ${repoSlug}
API base: ${apiBase}

When the user asks you to create a merge request (PR):

1. Run in parallel: \`git status\`, \`git diff\`, \`git log\`, \`git diff ${baseBranch}...HEAD\`
2. Push branch if needed
3. Create PR via API (example — adjust owner/repo/branch from remote):
\`\`\`bash
curl -sS -X POST "${apiBase}/repos/${repoSlug}/pulls" \\
  -H "Content-Type: application/json" \\
  -d "$(cat <<'EOF'
{"access_token":"'"$GITEE_TOKEN"'","title":"Short title","head":"feature-branch","base":"${baseBranch}","body":"## Summary\\n- ..."}
EOF
)"
\`\`\`
4. Return the MR web URL (https://gitee.com/${repoSlug}/pulls/N) when done.`

const customForgeSection = (baseBranch: string, webBase: string | null) => `# Creating pull requests (custom Git host)

Remote appears to be a self-hosted or enterprise forge (${webBase ?? 'custom'}).

- Use \`git\` for local commit/push workflow (same safety rules as GitHub).
- If \`gh\` is configured with \`GH_HOST\`, you may use \`gh pr create\` as on GitHub.
- Otherwise use the host's documented API or CLI; ask the user if authentication method is unclear.
- Compare branch with \`git diff ${baseBranch}...HEAD\` before opening a PR/MR.`

/** CI 专段（可单独注入子代理） */
export const getGitCiPromptSection = (ctx: GitForgeContext): string | null => {
  if (ctx.kind === 'github') return githubCiSection()
  if (ctx.kind === 'gitee' && ctx.repoSlug && ctx.apiBase) {
    return giteeCiSection(ctx.repoSlug, ctx.apiBase)
  }
  if (ctx.kind === 'custom' || ctx.remote) {
    return `# Investigating CI failures (custom forge)

Use \`gh\` if GH_HOST is configured, otherwise the host API. Prefer \`GitStatus\` / \`GitDiff\` / \`GitLog\` for local state.`
  }
  return null
}

/** 注入系统 prompt 的 forge 段落 */
export const getGitForgePromptSection = (ctx: GitForgeContext): string | null => {
  if (ctx.kind === 'unknown' && !ctx.remote) return null
  const base = ctx.defaultBranch ?? 'main'
  const parts = [GIT_SAFETY]
  if (ctx.kind === 'github') {
    parts.push(githubPrSection(base))
    const ci = getGitCiPromptSection(ctx)
    if (ci) parts.push(ci)
  } else if (ctx.kind === 'gitee' && ctx.repoSlug && ctx.apiBase) {
    parts.push(giteePrSection(base, ctx.repoSlug, ctx.apiBase))
    const ci = getGitCiPromptSection(ctx)
    if (ci) parts.push(ci)
  } else {
    parts.push(customForgeSection(base, ctx.webBase))
    const ci = getGitCiPromptSection(ctx)
    if (ci) parts.push(ci)
  }
  return parts.join('\n\n')
}

/** `/commit-push-pr` 斜杠命令注入的完整任务 prompt */
export const buildCommitPushPrPrompt = (ctx: GitForgeContext): string => {
  const base = ctx.defaultBranch ?? 'main'
  const repoLine = ctx.repoSlug ? `- Repository: ${ctx.repoSlug}` : '- Repository: (unknown)'
  const forgeLine = `- Forge: ${ctx.kind}`
  const ghLine =
    ctx.kind === 'github'
      ? `- gh auth: ${ctx.ghAuth}`
      : ctx.kind === 'gitee'
        ? `- Gitee token: ${process.env.GITEE_TOKEN ? 'set via settings' : 'not configured (set in Settings → General → Git hosting)'}`
        : ''

  const workflow =
    ctx.kind === 'gitee' && ctx.repoSlug && ctx.apiBase
      ? giteePrSection(base, ctx.repoSlug, ctx.apiBase)
      : ctx.kind === 'github'
        ? githubPrSection(base)
        : customForgeSection(base, ctx.webBase)

  return `${GIT_SAFETY}

## Context
${forgeLine}
${repoLine}
${ghLine}
- Base branch: ${base}

## Your task

Follow the forge-specific workflow below. Analyze ALL commits that will be included (git diff ${base}...HEAD), draft title/body, push if needed, create or update the PR/MR, and return the URL.

${workflow}`
}

/** `/investigate-ci` 斜杠命令注入的 CI 调查 prompt */
export const buildInvestigateCiPrompt = (ctx: GitForgeContext, linkedPrUrl?: string | null): string => {
  const ci = getGitCiPromptSection(ctx) ?? githubCiSection()
  const prLine = linkedPrUrl?.trim()
    ? `- Linked PR: ${linkedPrUrl.trim()} (start with gh pr checks / gh pr view)`
    : '- Linked PR: (none — detect branch from GitStatus or user message)'
  const repoLine = ctx.repoSlug ? `- Repository: ${ctx.repoSlug}` : '- Repository: (unknown)'

  return `${GIT_SAFETY}

## Context
- Forge: ${ctx.kind}
${repoLine}
${prLine}
- Default branch: ${ctx.defaultBranch ?? 'main'}
${ctx.kind === 'github' ? `- gh auth: ${ctx.ghAuth}` : ''}

## Your task

Investigate failing CI checks for this repository. Use GitStatus/GitDiff/GitLog for local git state. Use Bash+gh for remote CI (read-only gh commands auto-approve). Summarize root cause and suggest a minimal fix.

${ci}`
}

/** Environment 段追加 forge 行 */
export const formatForgeEnvLines = (ctx: GitForgeContext): string[] => {
  const lines: string[] = []
  if (ctx.remote) {
    lines.push(`Git remote origin: ${ctx.remote.url}`)
    lines.push(`Forge type: ${ctx.kind}`)
    if (ctx.repoSlug) lines.push(`Repository slug: ${ctx.repoSlug}`)
  }
  if (ctx.kind === 'github') {
    lines.push(`gh CLI auth: ${ctx.ghAuth}`)
    if (ctx.webBase && !ctx.webBase.includes('github.com')) {
      lines.push(`GitHub host: ${ctx.webBase}`)
    }
  }
  if (ctx.defaultBranch) lines.push(`Default branch: ${ctx.defaultBranch}`)
  return lines
}
