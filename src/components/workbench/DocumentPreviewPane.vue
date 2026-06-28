<script setup lang="ts">
import { ref, watch, onBeforeUnmount, computed } from 'vue'
import type { DocumentPreviewKind } from '../../utils/document-preview'
import { imageMimeForPath } from '../../utils/document-preview'
import { useI18n } from '../../i18n'

const props = defineProps<{
  kind: DocumentPreviewKind
  previewBase64?: string
  previewHtml?: string
  filePath?: string
}>()

const { t } = useI18n()
const pdfUrl = ref('')
const imageUrl = ref('')

const base64ToBlobUrl = (b64: string, mime: string): string => {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return URL.createObjectURL(new Blob([bytes], { type: mime }))
}

watch(
  () => [props.previewBase64, props.kind, props.filePath] as const,
  ([b64, kind, filePath]) => {
    if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value)
    if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
    pdfUrl.value = ''
    imageUrl.value = ''
    if (!b64) return
    if (kind === 'pdf') {
      pdfUrl.value = base64ToBlobUrl(b64, 'application/pdf')
    } else if (kind === 'image' && filePath) {
      imageUrl.value = base64ToBlobUrl(b64, imageMimeForPath(filePath))
    }
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value)
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
})

const docHtml = computed(() => props.previewHtml ?? '')
</script>

<template>
  <div class="doc-preview">
    <iframe
      v-if="kind === 'pdf' && pdfUrl"
      class="pdf-frame"
      :src="pdfUrl"
      title="PDF"
    />
    <div
      v-else-if="kind === 'docx'"
      class="docx-preview"
      v-html="docHtml"
    />
    <div v-else-if="kind === 'doc'" class="doc-unsupported">
      {{ t('editor.docUnsupported') }}
    </div>
    <div v-else-if="kind === 'image' && imageUrl" class="image-preview">
      <img :src="imageUrl" :alt="filePath ?? 'Image'" />
    </div>
  </div>
</template>

<style scoped>
.doc-preview {
  height: 100%;
  overflow: hidden;
  background: var(--wc-panel);
}

.pdf-frame {
  width: 100%;
  height: 100%;
  border: none;
  background: #525659;
}

.docx-preview {
  height: 100%;
  overflow: auto;
  padding: 24px 32px;
  line-height: 1.65;
  font-size: 14px;
  color: var(--wc-text);
}

.docx-preview :deep(h1),
.docx-preview :deep(h2),
.docx-preview :deep(h3) {
  margin: 1em 0 0.5em;
}

.docx-preview :deep(p) {
  margin: 0.5em 0;
}

.docx-preview :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

.docx-preview :deep(th),
.docx-preview :deep(td) {
  border: 1px solid var(--wc-border);
  padding: 6px 10px;
}

.docx-preview :deep(img) {
  max-width: 100%;
}

.doc-unsupported {
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  text-align: center;
  color: var(--wc-text-muted);
  font-size: 14px;
  line-height: 1.6;
}

.image-preview {
  height: 100%;
  overflow: auto;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  -webkit-overflow-scrolling: touch;
}

.image-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
}
</style>
