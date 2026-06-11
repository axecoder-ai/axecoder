/// <reference types="vite/client" />

import 'vue'

declare module 'vue' {
  interface ComponentCustomProperties {
    $t: (key: string, params?: Record<string, string | number>) => string
  }
}

declare global {
  interface Window {
    ipcRenderer: import('electron').IpcRenderer
    axecoder: import('./types/axecoder').AxeCoderFs
    MonacoEnvironment?: {
      getWorker?: (moduleId: string, label: string) => Worker
    }
  }
}

export {}
