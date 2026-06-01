/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}

interface Window {
  ipcRenderer: import('electron').IpcRenderer
  axecoder: import('./types/axecoder').AxeCoderFs
}
