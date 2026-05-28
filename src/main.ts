import { createApp } from 'vue'
import App from './App.vue'
import '@fontsource/jetbrains-mono/400.css'
import './style.css'

document.documentElement.setAttribute('data-theme', 'vscode')

createApp(App).mount('#app')
