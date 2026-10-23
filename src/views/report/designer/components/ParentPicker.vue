<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useDesignerStore } from '@/stores'
import { notify } from '@/utils'

const props = defineProps<{
  modelValue: string
  label: string
  kind: 'left' | 'top'
}>()
const emit = defineEmits<{ (e: 'update:modelValue', value: string): void }>()

const store = useDesignerStore()
const colDraft = ref('')
const rowDraft = ref('')

const isDefault = computed(() => !props.modelValue || props.modelValue === 'root')
const picking = computed(() => store.parentPick === props.kind)

function colToNum(col: string): number {
  let n = 0
  for (const ch of col) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n
}

function numToCol(n: number): string {
  let s = ''
  let value = n
  while (value > 0) {
    const m = (value - 1) % 26
    s = String.fromCharCode(65 + m) + s
    value = Math.floor((value - 1) / 26)
  }
  return s
}

function splitCell(value: string): { col: string; row: string } {
  const match = /^([A-Z]+)(\d+)$/.exec(value || '')
  return match ? { col: match[1], row: match[2] } : { col: '', row: '' }
}

function neighbor(): string {
  const { col, row } = splitCell(store.selected)
  if (!col || !row) return ''
  const colNum = colToNum(col)
  const rowNum = Number(row)
  if (props.kind === 'left') {
    const target = colNum > 1 ? colNum - 1 : colNum + 1
    return `${numToCol(target)}${row}`
  }
  const target = rowNum > 1 ? rowNum - 1 : rowNum + 1
  return `${col}${target}`
}

watch(
  () => props.modelValue,
  (value) => {
    if (!value || value === 'root') {
      colDraft.value = ''
      rowDraft.value = ''
      return
    }
    const { col, row } = splitCell(value)
    if (col) colDraft.value = col
    if (row) rowDraft.value = row
  },
  { immediate: true },
)

function commit() {
  const col = colDraft.value.toUpperCase().replace(/[^A-Z]/g, '')
  const row = rowDraft.value.replace(/[^0-9]/g, '')
  colDraft.value = col
  rowDraft.value = row
  if (col && row) emit('update:modelValue', `${col}${row}`)
}

function setDefault() {
  store.cancelParentPick()
  colDraft.value = ''
  rowDraft.value = ''
  emit('update:modelValue', 'root')
}

function setCustom() {
  if (!isDefault.value) return
  const initial = neighbor()
  const { col, row } = splitCell(initial)
  colDraft.value = col
  rowDraft.value = row
  if (initial) emit('update:modelValue', initial)
}

function startPick() {
  if (picking.value) {
    store.cancelParentPick()
    return
  }
  store.beginParentPick(props.kind)
  notify.info('请在表格中点击要作为父格的单元格，按 Esc 取消')
}

onBeforeUnmount(() => {
  if (picking.value) store.cancelParentPick()
})
</script>

<template>
  <div class="parent-picker">
    <div class="parent-head">
      <span class="parent-label">{{ label }}：</span>
      <label class="parent-radio">
        <input
          type="radio"
          :name="`${kind}-parent-mode`"
          :checked="isDefault"
          @change="setDefault"
        />
        <span>默认</span>
      </label>
      <label class="parent-radio">
        <input
          type="radio"
          :name="`${kind}-parent-mode`"
          :checked="!isDefault"
          @change="setCustom"
        />
        <span>自定义</span>
      </label>
    </div>
    <div class="parent-inputs">
      <input
        class="parent-col"
        :disabled="isDefault"
        :value="colDraft"
        placeholder="D"
        @input="colDraft = ($event.target as HTMLInputElement).value; commit()"
      />
      <input
        class="parent-row"
        :disabled="isDefault"
        :value="rowDraft"
        placeholder="5"
        @input="rowDraft = ($event.target as HTMLInputElement).value; commit()"
      />
      <button
        class="parent-pick"
        :class="{ active: picking }"
        :disabled="isDefault"
        @click="startPick"
      >
        {{ picking ? '点击表格选择…' : '选择' }}
      </button>
    </div>
  </div>
</template>
