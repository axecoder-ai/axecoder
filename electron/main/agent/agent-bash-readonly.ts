/** CC readOnlyCommandValidation 子集 — gh 只读命令前缀 */
const GH_READ_ONLY_PREFIXES = [
  'gh pr view',
  'gh pr list',
  'gh pr diff',
  'gh pr checks',
  'gh pr status',
  'gh issue view',
  'gh issue list',
  'gh issue status',
  'gh auth status',
  'gh repo view',
  'gh run view',
  'gh run list',
  'gh workflow view',
  'gh workflow list',
]

const stripEnvPrefix = (command: string): string => {
  let rest = command.trim()
  while (/^\w+=\S+\s+/.test(rest)) {
    rest = rest.replace(/^\w+=\S+\s+/, '')
  }
  return rest.trim()
}

/** Bash 只读 gh 命令 — 无需用户批准，自动执行 */
export const isReadOnlyBashCommand = (command: string): boolean => {
  const body = stripEnvPrefix(command).toLowerCase()
  if (!body.startsWith('gh ')) return false
  return GH_READ_ONLY_PREFIXES.some((p) => body.startsWith(p))
}
