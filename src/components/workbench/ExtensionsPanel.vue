<script setup lang="ts">
defineProps<{
  visible: boolean
}>()

const builtins = [
  { name: 'Markdown 编辑', desc: 'Monaco 编辑器 + 实时预览' },
  { name: '项目搜索', desc: '基于 ripgrep 的全文检索' },
  { name: '文件管理', desc: '树形浏览、新建/重命名/拖放' },
  { name: '自动保存', desc: '可在设置中配置延迟' },
  { name: 'AI 助手', desc: '本地会话（需配置 API 后接入模型）' },
]
</script>

<template>
  <aside v-show="visible" class="sidebar-panel">
    <div class="panel-title">扩展</div>
    <div class="panel-body">
      <p class="hint">AxeCoder 内置功能（V1 无第三方扩展市场）：</p>
      <ul class="ext-list">
        <li v-for="(ext, i) in builtins" :key="i">
          <div class="ext-name">{{ ext.name }}</div>
          <div class="ext-desc">{{ ext.desc }}</div>
        </li>
      </ul>
    </div>
  </aside>
</template>

<style scoped>
.sidebar-panel {
  width: 100%;
  background: var(--wc-sidebar);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  min-height: 0;
}

.panel-title {
  height: 35px;
  display: flex;
  align-items: center;
  padding: 0 16px;
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.04em;
  color: var(--wc-text-muted);
  border-bottom: 1px solid var(--wc-border);
  text-transform: uppercase;
}

.panel-body {
  flex: 1;
  overflow: auto;
  padding: 12px;
}

.hint {
  font-size: 12px;
  color: var(--wc-text-muted);
  margin-bottom: 12px;
}

.ext-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.ext-name {
  font-size: 13px;
  font-weight: 500;
}

.ext-desc {
  font-size: 11px;
  color: var(--wc-text-dim);
  margin-top: 2px;
}
</style>
