<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useDesignerStore } from '@/stores'
import { notify } from '@/utils'
import { cellName, defaultStyle, noBorders, type CellStyleModel } from '@/model/types'
import { univerBridge } from '@/univer/bridge'
import { applyDesignAfterOp, captureDesign, type LayoutOp } from '@/univer/rowcol'
import CellContextMenu from './CellContextMenu.vue'
import InsertDialog from './InsertDialog.vue'

const store = useDesignerStore()
const container = ref<HTMLElement | null>(null)
const menu = reactive({ visible: false, x: 0, y: 0, row: 1, col: 1 })
const copiedStyle = ref<CellStyleModel | null>(null)
const insertDialog = reactive({
  show: false,
  mode: 'row' as 'row' | 'column',
  where: 'before' as 'before' | 'after',
  index: 1,
})

const NAV_KEYS = new Set([
  'ArrowUp',
  'ArrowDown',
  'ArrowLeft',
  'ArrowRight',
  'Tab',
  'Enter',
  'Home',
  'End',
  'PageUp',
  'PageDown',
])
let selectionTimer: number | undefined

function onKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape' && store.parentPick) {
    store.cancelParentPick()
    return
  }
  if (!NAV_KEYS.has(e.key)) return
  if (selectionTimer) window.clearTimeout(selectionTimer)
  selectionTimer = window.setTimeout(() => univerBridge.syncSelection(), 40)
}

function onDocKeydown(e: KeyboardEvent) {
  if (e.key === 'Escape') menu.visible = false
}

function onDocMouseDown(e: MouseEvent) {
  if (!menu.visible || e.button !== 0) return
  const target = e.target as HTMLElement | null
  if (target?.closest('.cell-context-menu')) return
  menu.visible = false
}

function onWheel() {
  if (menu.visible) menu.visible = false
}

function onWindowBlur() {
  menu.visible = false
}

function onContextMenu(e: MouseEvent) {
  e.preventDefault()
  store.cancelParentPick()
  const hover = univerBridge.getHoverCell()
  const active = univerBridge.getActiveCellPosition()
  const pos = hover || active
  if (!pos) return

  const name = cellName(pos.row + 1, pos.column + 1)
  store.selected = name
  store.activePanel = 'property'
  univerBridge.activateCell(name)
  const effective = univerBridge.getActiveCellPosition() || pos
  menu.row = effective.row + 1
  menu.col = effective.column + 1
  store.selected = cellName(menu.row, menu.col)
  menu.x = e.clientX
  menu.y = e.clientY
  menu.visible = true
}

async function runLayout(op: LayoutOp) {
  await univerBridge.flushSync()
  const snapshot = captureDesign(store.model)
  if (op.kind === 'insertRow') {
    if (op.where === 'before') univerBridge.insertRowBefore(op.index, op.count)
    else univerBridge.insertRowAfter(op.index, op.count)
  } else if (op.kind === 'deleteRow') {
    univerBridge.deleteRow(op.index)
  } else if (op.kind === 'insertColumn') {
    if (op.where === 'before') univerBridge.insertColumnBefore(op.index, op.count)
    else univerBridge.insertColumnAfter(op.index, op.count)
  } else {
    univerBridge.deleteColumn(op.index)
  }
  await univerBridge.flushSync()
  applyDesignAfterOp(store.model, snapshot, op)
  window.setTimeout(() => univerBridge.syncSelection(), 60)
}

function openInsert(mode: 'row' | 'column', where: 'before' | 'after') {
  insertDialog.mode = mode
  insertDialog.where = where
  insertDialog.index = mode === 'row' ? menu.row : menu.col
  insertDialog.show = true
}

async function onInsertConfirm(count: number) {
  const { mode, where, index } = insertDialog
  insertDialog.show = false
  if (mode === 'row') {
    await runLayout({ kind: 'insertRow', index, where, count })
  } else {
    await runLayout({ kind: 'insertColumn', index, where, count })
  }
}

async function handleMenuAction(key: string) {
  const row = menu.row
  const col = menu.col
  menu.visible = false
  try {
    switch (key) {
      case 'insert-row-before':
        openInsert('row', 'before')
        break
      case 'insert-row-after':
        openInsert('row', 'after')
        break
      case 'insert-col-before':
        openInsert('column', 'before')
        break
      case 'insert-col-after':
        openInsert('column', 'after')
        break
      case 'delete-row':
        await runLayout({ kind: 'deleteRow', index: row })
        break
      case 'delete-col':
        await runLayout({ kind: 'deleteColumn', index: col })
        break
      case 'row-height': {
        const current = store.model.rowHeights[row - 1] ?? 24
        const input = window.prompt('请输入行高', String(current))
        if (input == null) return
        const height = Number(input)
        if (!Number.isFinite(height) || height <= 0) {
          notify.error('请输入有效行高')
          return
        }
        univerBridge.setRowHeight(row, height)
        await univerBridge.flushSync()
        break
      }
      case 'col-width': {
        const current = store.model.colWidths[col - 1] ?? 90
        const input = window.prompt('请输入列宽', String(current))
        if (input == null) return
        const width = Number(input)
        if (!Number.isFinite(width) || width <= 0) {
          notify.error('请输入有效列宽')
          return
        }
        univerBridge.setColumnWidth(col, width)
        await univerBridge.flushSync()
        break
      }
      case 'band-title':
        store.setRowBand(row, 'title')
        notify.success('已设为标题行')
        break
      case 'band-header':
        store.setRowBand(row, 'headerrepeat')
        notify.success('已设为重复表头')
        break
      case 'band-footer':
        store.setRowBand(row, 'footerrepeat')
        notify.success('已设为重复表尾')
        break
      case 'band-summary':
        store.setRowBand(row, 'summary')
        notify.success('已设为总结行')
        break
      case 'band-clear':
        store.clearRowBand(row)
        notify.success('已取消行类型')
        break
      case 'copy-style': {
        const cell = store.model.cells[cellName(row, col)]
        copiedStyle.value = cell
          ? (JSON.parse(JSON.stringify(cell.style)) as CellStyleModel)
          : { ...defaultStyle() }
        notify.success('已复制单元格样式')
        break
      }
      case 'paste-style': {
        if (!copiedStyle.value) return
        const name = cellName(row, col)
        const cell = store.ensureCell(name, row, col)
        cell.style = { ...copiedStyle.value }
        break
      }
      case 'clear-content':
        univerBridge.clearContent(row, col)
        await univerBridge.flushSync()
        break
      case 'clear-format': {
        const target = store.model.cells[cellName(row, col)]
        if (target) target.style = { ...defaultStyle(), borders: noBorders() }
        univerBridge.clearFormat(row, col)
        await univerBridge.flushSync()
        break
      }
      case 'clear-all':
        univerBridge.clearAll(row, col)
        await univerBridge.flushSync()
        break
    }
  } catch (e: any) {
    notify.error(e?.message || '操作失败')
  }
}

onMounted(() => {
  if (!container.value) return
  univerBridge.mount(container.value, store.model, {
    getModel: () => store.model,
    onModel: (model) => store.applySheetModel(model),
    onSelect: (name) => {
      const pick = store.parentPick
      if (pick) {
        const target = store.selected
        if (name === target) {
          notify.info('不能选择当前单元格作为父格')
        } else {
          store.setParent(pick, name)
        }
        store.parentPick = null
        window.setTimeout(() => univerBridge.activateCell(target), 0)
        return
      }
      store.selected = name
      store.activePanel = 'property'
    },
  })
  container.value.addEventListener('keydown', onKeydown)
  container.value.addEventListener('contextmenu', onContextMenu)
  container.value.addEventListener('wheel', onWheel, { passive: true })
  document.addEventListener('mousedown', onDocMouseDown, true)
  document.addEventListener('keydown', onDocKeydown)
  window.addEventListener('blur', onWindowBlur)
})

onBeforeUnmount(() => {
  container.value?.removeEventListener('keydown', onKeydown)
  container.value?.removeEventListener('contextmenu', onContextMenu)
  container.value?.removeEventListener('wheel', onWheel)
  document.removeEventListener('mousedown', onDocMouseDown, true)
  document.removeEventListener('keydown', onDocKeydown)
  window.removeEventListener('blur', onWindowBlur)
  if (selectionTimer) window.clearTimeout(selectionTimer)
  univerBridge.destroy()
})

watch(
  () => store.modelVersion,
  () => {
    univerBridge.reload(store.model)
  },
)

watch(
  () => store.selectedCell,
  (cell) => {
    if (cell) univerBridge.applyCell(cell)
  },
  { deep: true },
)
</script>

<template>
  <div ref="container" class="univer-container" />
  <CellContextMenu
    v-if="menu.visible"
    :x="menu.x"
    :y="menu.y"
    :can-paste="!!copiedStyle"
    @action="handleMenuAction"
    @close="menu.visible = false"
  />
  <InsertDialog
    v-model:show="insertDialog.show"
    :mode="insertDialog.mode"
    @confirm="onInsertConfirm"
  />
</template>
