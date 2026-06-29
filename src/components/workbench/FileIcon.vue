<script setup lang="ts">
import { computed } from 'vue'
import { fileIconUrl, folderIconUrl } from '../../utils/fileIcon'

const props = defineProps<{
  name: string
  folder?: boolean
  open?: boolean
  symlink?: boolean
}>()

const src = computed(() =>
  props.folder ? folderIconUrl(!!props.open) : fileIconUrl(props.name),
)
</script>

<template>
  <span class="file-icon-wrap" :class="{ symlink: props.symlink }">
    <img class="file-icon" :src="src" :alt="''" draggable="false" />
  </span>
</template>

<style scoped>
.file-icon-wrap {
  position: relative;
  width: 16px;
  height: 16px;
  flex-shrink: 0;
}

.file-icon {
  width: 16px;
  height: 16px;
  object-fit: contain;
}

.file-icon-wrap.symlink::after {
  content: '';
  position: absolute;
  right: -1px;
  bottom: 0;
  width: 0;
  height: 0;
  border-left: 5px solid transparent;
  border-bottom: 5px solid #3794ff;
}
</style>
