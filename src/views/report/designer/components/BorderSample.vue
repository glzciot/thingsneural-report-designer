<script setup lang="ts">
withDefaults(
  defineProps<{
    sides?: Array<'top' | 'right' | 'bottom' | 'left'>
    color?: string
    size?: number
  }>(),
  { sides: () => [], color: '#0d6b5c', size: 2 },
)
</script>

<template>
  <span class="border-sample">
    <span
      v-for="side in sides"
      :key="side"
      class="border-sample-side"
      :class="`side-${side}`"
      :style="{ background: color, ['--border-size' as string]: `${size}px` }"
    />
  </span>
</template>
