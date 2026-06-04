import type { GitForgeKind, ParsedPullRequest } from './forge-types'

const GH_PR_URL =
  /https:\/\/(?:[\w.-]+\.)?github\.com\/([^/\s]+\/[^/\s]+)\/pull\/(\d+)/i
const GITEE_PR_URL =
  /https:\/\/(?:[\w.-]+\.)?gitee\.com\/([^/\s]+\/[^/\s]+)\/pulls\/(\d+)/i

const parseUrl = (
  url: string,
  forge: GitForgeKind,
): ParsedPullRequest | null => {
  const re = forge === 'gitee' ? GITEE_PR_URL : GH_PR_URL
  const m = url.match(re)
  if (!m?.[1] || !m?.[2]) return null
  return {
    url: m[0],
    repository: m[1],
    number: parseInt(m[2], 10),
    forge: forge === 'gitee' ? 'gitee' : 'github',
  }
}

/** 从 Bash stdout 提取 PR/MR URL（对齐 CC gitOperationTracking） */
export const extractPullRequestFromOutput = (
  command: string,
  stdout: string,
  forgeHint: GitForgeKind = 'github',
): ParsedPullRequest | null => {
  const lower = command.toLowerCase()
  const isPrOp =
    /\bgh\s+pr\s+(create|edit|merge)\b/.test(lower) ||
    /\bgitee.*pulls\b/i.test(lower) ||
    /\bcurl\b.*\/pulls\b/i.test(lower)
  if (!isPrOp && !stdout.includes('pull')) return null

  if (forgeHint === 'gitee' || GITEE_PR_URL.test(stdout)) {
    const m = stdout.match(GITEE_PR_URL)
    if (m) return parseUrl(m[0], 'gitee')
  }
  const gh = stdout.match(GH_PR_URL)
  if (gh) return parseUrl(gh[0], 'github')

  // gh pr create 输出 "https://github.com/..."
  const generic = stdout.match(/https:\/\/[^\s]+\/pull(?:s)?\/\d+/i)
  if (generic) {
    return (
      parseUrl(generic[0], 'gitee') ||
      parseUrl(generic[0], 'github') ||
      null
    )
  }
  return null
}
