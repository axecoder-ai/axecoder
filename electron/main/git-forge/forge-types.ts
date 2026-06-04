export type GitForgeProviderSetting = 'auto' | 'github' | 'gitee' | 'custom'

export type GitForgeKind = 'github' | 'gitee' | 'custom' | 'unknown'

export type GitRemoteInfo = {
  url: string
  host: string
  owner: string
  repo: string
}

export type GhAuthStatus = 'authenticated' | 'not_authenticated' | 'not_installed'

export type GitForgeContext = {
  kind: GitForgeKind
  remote: GitRemoteInfo | null
  defaultBranch: string | null
  ghAuth: GhAuthStatus
  webBase: string | null
  apiBase: string | null
  repoSlug: string | null
}

export type ParsedPullRequest = {
  url: string
  number: number
  repository: string
  forge: GitForgeKind
}
