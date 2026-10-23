<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps<{
  x: number
  y: number
  canPaste: boolean
}>()
const emit = defineEmits<{
  (e: 'action', key: string): void
  (e: 'close'): void
}>()

type MenuItem =
  | { sep: true }
  | { key: string; label: string; icon: string; color: string; disabled?: boolean }

const items = computed<MenuItem[]>(() => [
  { key: 'insert-row-before', label: '插入行(上)', icon: 'rowPlus', color: '#3b82f6' },
  { key: 'insert-row-after', label: '插入行(下)', icon: 'rowPlus', color: '#3b82f6' },
  { key: 'insert-col-before', label: '插入列(前)', icon: 'colPlus', color: '#3b82f6' },
  { key: 'insert-col-after', label: '插入列(后)', icon: 'colPlus', color: '#3b82f6' },
  { key: 'delete-row', label: '删除行', icon: 'rowDelete', color: '#ef4444' },
  { key: 'delete-col', label: '删除列', icon: 'colDelete', color: '#ef4444' },
  { key: 'row-height', label: '设置行高', icon: 'rowHeight', color: '#ef4444' },
  { key: 'col-width', label: '设置列宽', icon: 'colWidth', color: '#ef4444' },
  { sep: true },
  { key: 'band-title', label: '标题行', icon: 'titleRow', color: '#8b5cf6' },
  { key: 'band-header', label: '重复表头', icon: 'refresh', color: '#8b5cf6' },
  { key: 'band-footer', label: '重复表尾', icon: 'refresh', color: '#8b5cf6' },
  { key: 'band-summary', label: '总结行', icon: 'summary', color: '#8b5cf6' },
  { key: 'band-clear', label: '取消行类型', icon: 'ban', color: '#8b5cf6' },
  { key: 'copy-style', label: '复制单元格样式', icon: 'copy', color: '#ef4444' },
  { key: 'paste-style', label: '粘贴单元格样式', icon: 'paste', color: '#ef4444', disabled: !props.canPaste },
  { sep: true },
  { key: 'clear-content', label: '清空内容', icon: 'eraser', color: '#0d9488' },
  { key: 'clear-format', label: '清空格式', icon: 'palette', color: '#0d9488' },
  { key: 'clear-all', label: '清空所有', icon: 'clearAll', color: '#0d9488' },
])

const root = ref<HTMLElement | null>(null)
const position = ref({ left: 0, top: 0 })

function place() {
  const width = root.value?.offsetWidth ?? 236
  const height = root.value?.offsetHeight ?? 700
  position.value = {
    left: Math.max(8, Math.min(props.x, window.innerWidth - width - 8)),
    top: Math.max(8, Math.min(props.y, window.innerHeight - height - 8)),
  }
}

function choose(item: MenuItem) {
  if ('sep' in item || item.disabled) return
  emit('action', item.key)
  emit('close')
}

onMounted(() => {
  place()
  window.addEventListener('resize', place)
})
onBeforeUnmount(() => window.removeEventListener('resize', place))
watch(
  () => [props.x, props.y],
  () => nextTick(place),
)
</script>

<template>
  <Teleport to="body">
    <div
      ref="root"
      class="cell-context-menu"
      :style="{ left: `${position.left}px`, top: `${position.top}px` }"
      @mousedown.stop
      @contextmenu.prevent
    >
      <template v-for="(item, index) in items" :key="index">
        <div v-if="'sep' in item" class="menu-sep" />
        <button v-else class="menu-item" :disabled="item.disabled" @click="choose(item)">
          <span class="menu-icon" :style="{ color: item.disabled ? '#c9cdd4' : item.color }">
            <AppIcon :name="item.icon" :size="18" />
          </span>
          <span class="menu-label">{{ item.label }}</span>
        </button>
      </template>
    </div>
  </Teleport>
</template>
