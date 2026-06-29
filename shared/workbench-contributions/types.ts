/** VS Code contributes 子集，供原生工作台消费 */

export type ViewContainerContribution = {
  id: string
  title: string
  icon?: string
}

export type ViewContribution = {
  id: string
  name: string
  type: 'webview'
  /** workbench-shell hash 路由，默认等于 id */
  webviewEntry?: string
}

export type CommandContribution = {
  command: string
  title: string
  category?: string
  icon?: string
}

export type ThemeContribution = {
  id: string
  label: string
}

export type ManifestContributes = {
  viewsContainers?: Record<string, ViewContainerContribution[]>
  views?: Record<string, ViewContribution[]>
  commands?: CommandContribution[]
  themes?: ThemeContribution[]
}

export type WorkbenchContributions = {
  viewsContainers: Record<string, ViewContainerContribution[]>
  views: Record<string, ViewContribution[]>
  commands: CommandContribution[]
  themes: ThemeContribution[]
}
