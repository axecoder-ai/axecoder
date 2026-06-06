<script setup lang="ts">
import { ref, watch, onBeforeUnmount, computed } from 'vue'
import type { DocumentPreviewKind } from '../../utils/document-preview'
import { useI18n } from '../../i18n'

const props = defineProps<{
  kind: DocumentPreviewKind
  previewBase64?: string
  previewHtml?: string
}>()

const { t } = useI18n()
const pdfUrl = ref('')

watch(
  () => props.previewBase64,
  (b64) => {
    if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value)
    pdfUrl.value = ''
    if (!b64 || props.kind !== 'pdf') return
    const binary = atob(b64)
    const bytes = new Uint8Array(binary.length)
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
    pdfUrl.value = URL.createObjectURL(new Blob([bytes], { type: 'application/pdf' }))
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  if (pdfUrl.value) URL.revokeObjectURL(pdfUrl.value)
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
</style>
