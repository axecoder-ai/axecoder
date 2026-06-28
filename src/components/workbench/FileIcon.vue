<script setup lang="ts">
import { computed } from 'vue'
import { fileIconUrl, folderIconUrl } from '../../utils/fileIcon'

const props = defineProps<{
  name: string
  folder?: boolean
  open?: boolean
}>()

const src = computed(() =>
  props.folder ? folderIconUrl(!!props.open) : fileIconUrl(props.name),
)
</script>

<template>
  <img class="file-icon" :src="src" :alt="''" draggable="false" />
</template>

<style scoped>
.file-icon {
  width: 16px;
  height: 16px;
  flex-shrink: 0;
  object-fit: contain;
}
</style>
