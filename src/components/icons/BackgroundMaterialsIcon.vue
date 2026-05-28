<script setup lang="ts">
withDefaults(
  defineProps<{
    size?: number
  }>(),
  { size: 16 },
)
</script>

<template>
  <svg
    class="background-materials-icon"
    :width="size"
    :height="size"
    viewBox="0 0 16 16"
    fill="none"
    aria-hidden="true"
  >
    <circle cx="8" cy="8" r="6.75" stroke="currentColor" stroke-width="1" />
    <circle cx="8" cy="8" r="5.15" stroke="currentColor" stroke-width="0.5" opacity="0.35" />
    <circle cx="8" cy="8" r="3.55" stroke="currentColor" stroke-width="0.5" opacity="0.35" />
    <circle cx="8" cy="8" r="1.1" fill="currentColor" />
    <g transform="translate(8 8)">
      <g transform="rotate(60)">
        <path
          fill="currentColor"
          d="M0 -5.05a.5.5 0 1 1 .1 -1c.5-.1.9.35.72.82a.42.42 0 1 1-.82.1c-.1-.52-.48-.88-1-.92a.5.5 0 1 1 1 0z"
        />
      </g>
      <g transform="rotate(180)">
        <path
          fill="currentColor"
          d="M0 -5.05a.5.5 0 1 1 .1 -1c.5-.1.9.35.72.82a.42.42 0 1 1-.82.1c-.1-.52-.48-.88-1-.92a.5.5 0 1 1 1 0z"
        />
      </g>
      <g transform="rotate(300)">
        <path
          fill="currentColor"
          d="M0 -5.05a.5.5 0 1 1 .1 -1c.5-.1.9.35.72.82a.42.42 0 1 1-.82.1c-.1-.52-.48-.88-1-.92a.5.5 0 1 1 1 0z"
        />
      </g>
    </g>
  </svg>
</template>

<style scoped>
.background-materials-icon {
  display: block;
  flex-shrink: 0;
}
</style>
