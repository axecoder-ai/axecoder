import { ref, onMounted } from 'vue'
import type { WorkbenchContributions } from '../../shared/workbench-contributions/types'

const contributions = ref<WorkbenchContributions | null>(null)
let loadPromise: Promise<WorkbenchContributions> | null = null

export const useWorkbenchContributions = () => {
  const load = async (): Promise<WorkbenchContributions> => {
    if (contributions.value) return contributions.value
    if (!loadPromise) {
      loadPromise = window.axecoder
        .getWorkbenchContributions()
        .then((c) => {
          contributions.value = c
          return c
        })
    }
    return loadPromise
  }

  onMounted(() => {
    void load()
  })

  return { contributions, load }
}

/** 侧栏主容器 id（V1 固定取 activitybar 第一个容器） */
export const primarySidebarContainerId = (c: WorkbenchContributions): string => {
  const list = c.viewsContainers.activitybar ?? c.viewsContainers['activitybar'] ?? []
  return list[0]?.id ?? 'workbench-primary'
}

export const sidebarViewItems = (c: WorkbenchContributions) => {
  const containerId = primarySidebarContainerId(c)
  const views = c.views[containerId] ?? []
  const iconById: Record<string, string> = {
    explorer: 'files',
    search: 'search',
    scm: 'source-control',
    'axecoder.chat': 'comment-discussion',
  }
  return views.map((v) => ({
    id: v.id,
    title: v.name,
    icon: iconById[v.id] ?? 'circle-outline',
    webviewEntry: v.webviewEntry ?? v.id,
  }))
}
