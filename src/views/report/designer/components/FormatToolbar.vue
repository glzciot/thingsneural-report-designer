<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useDesignerStore } from '@/stores'
import {
  borderSide,
  defaultBorders,
  noBorders,
  parseCellName,
  type CellBorders,
  type CellModel,
  type CellStyleModel,
  type ValueType,
} from '@/model/types'
import { debounce, notify } from '@/utils'
import { univerBridge } from '@/univer/bridge'
import AppIcon from './AppIcon.vue'
import BorderSample from './BorderSample.vue'
import BorderDialog from './BorderDialog.vue'
import ColorPicker from './ColorPicker.vue'

const store = useDesignerStore()
const cell = computed(() => store.model.cells[store.selected] || null)

const fontFamilies = ['宋体', '黑体', '楷体', '微软雅黑', 'Arial', 'Times New Roman']
const fontSizes = [8, 9, 10, 11, 12, 14, 16, 18, 20, 24, 28]
const alignHItems = [
  { value: 'left', label: '左对齐', icon: 'alignLeft' },
  { value: 'center', label: '居中', icon: 'alignCenter' },
  { value: 'right', label: '右对齐', icon: 'alignRight' },
] as const
const alignVItems = [
  { value: 'top', label: '顶端对齐' },
  { value: 'middle', label: '垂直居中' },
  { value: 'bottom', label: '底端对齐' },
] as const
const borderItems: Array<{
  key: 'all' | 'none' | 'left' | 'right' | 'top' | 'bottom' | 'custom'
  label: string
  sides: Array<keyof CellBorders>
}> = [
  { key: 'all', label: '所有框线', sides: ['top', 'right', 'bottom', 'left'] },
  { key: 'none', label: '无框线', sides: [] },
  { key: 'left', label: '左框线', sides: ['left'] },
  { key: 'right', label: '右框线', sides: ['right'] },
  { key: 'top', label: '上框线', sides: ['top'] },
  { key: 'bottom', label: '下框线', sides: ['bottom'] },
  { key: 'custom', label: '自定义框线', sides: ['top', 'right', 'bottom', 'left'] },
]
const chartTypes = [
  { value: 'bar', label: '柱状图' },
  { value: 'line', label: '折线图' },
  { value: 'pie', label: '饼图' },
  { value: 'doughnut', label: '环形图' },
  { value: 'area', label: '面积图' },
  { value: 'horizontalBar', label: '条形图' },
  { value: 'radar', label: '雷达图' },
  { value: 'polarArea', label: '极坐标图' },
  { value: 'scatter', label: '散点图' },
  { value: 'bubble', label: '气泡图' },
]
const codeItems = [
  { value: 'qrcode', label: '二维码' },
  { value: 'barcode', label: '条形码' },
] as const

type MenuName =
  | 'alignH'
  | 'alignV'
  | 'border'
  | 'fontFamily'
  | 'fontSize'
  | 'fontColor'
  | 'bgColor'
  | 'freeze'
  | 'chart'
  | 'code'

const activeMenu = ref<MenuName | null>(null)
const colorTarget = ref<'font' | 'bg'>('font')
const borderDialog = ref(false)
const borderDraft = ref<CellBorders>(defaultBorders())

const currentFontFamily = computed(() => cell.value?.style.fontFamily || '宋体')
const currentFontSize = computed(() => cell.value?.style.fontSize || 10)
const currentFontColor = computed(() => cell.value?.style.forecolor || '0,0,0')
const currentBgColor = computed(() => cell.value?.style.bgcolor || '')
const activeBorderKey = computed(() => {
  const borders = cell.value?.style.borders
  if (!borders) return 'custom'
  const keys: Array<keyof CellBorders> = ['top', 'right', 'bottom', 'left']
  const enabled = keys.filter(
    (key) => borders[key]?.style !== 'none' && borders[key]?.size > 0,
  )
  if (!enabled.length) return 'none'
  if (enabled.length === 4) {
    const first = borders.top
    const same = keys.every(
      (key) =>
        borders[key].style === first.style &&
        borders[key].size === first.size &&
        borders[key].color === first.color,
    )
    return same ? 'all' : 'custom'
  }
  if (enabled.length === 1) return enabled[0]
  return 'custom'
})

function ensureSelectedCell(markForStyle = false): CellModel | null {
  const pos = parseCellName(store.selected)
  if (!pos) return null
  const existed = !!store.model.cells[store.selected]
  const cell = store.ensureCell(store.selected, pos.row, pos.col)
  if (markForStyle && !existed && univerBridge.isReady()) {
    // 新单元格先应用默认样式（含默认框线），再应用工具条改动，避免同步时丢失默认框线
    univerBridge.applyCell(cell)
    univerBridge.markCell(cell)
  }
  return cell
}

function patchStyle(patch: Partial<CellStyleModel>) {
  const target = ensureSelectedCell(true)
  if (!target) {
    notify.info('请先选择一个单元格')
    return
  }
  if (univerBridge.isReady()) univerBridge.applyStyleToSelection(patch)
  else store.updateStyle(patch)
}

function toggle(key: 'bold' | 'italic' | 'underline') {
  const target = ensureSelectedCell(true)
  if (!target) return
  patchStyle({ [key]: !target.style[key] })
}

function setFontFamily(value: string) {
  patchStyle({ fontFamily: value })
  closeMenu()
}

function setFontSize(value: number) {
  patchStyle({ fontSize: value })
  closeMenu()
}

function applyAlignH(value: 'left' | 'center' | 'right') {
  patchStyle({ align: value })
  closeMenu()
}

function applyAlignV(value: 'top' | 'middle' | 'bottom') {
  patchStyle({ valign: value })
  closeMenu()
}

function cloneBorders(value: CellBorders): CellBorders {
  return {
    top: { ...value.top },
    right: { ...value.right },
    bottom: { ...value.bottom },
    left: { ...value.left },
  }
}

function applyBorder(key: 'all' | 'none' | 'left' | 'right' | 'top' | 'bottom') {
  const target = ensureSelectedCell(true)
  if (!target) return
  const current = target.style.borders || defaultBorders()
  let borders: CellBorders
  if (key === 'none') {
    borders = noBorders()
  } else if (key === 'all') {
    const side = borderSide('solid', 1, '0,0,0')
    borders = { top: { ...side }, right: { ...side }, bottom: { ...side }, left: { ...side } }
  } else {
    borders = cloneBorders(current)
    borders[key] = borderSide('solid', 1, '0,0,0')
  }
  target.style = { ...target.style, borders }
  if (univerBridge.isReady()) univerBridge.applyBorderPreset(key)
  closeMenu()
}

function openCustomBorder() {
  const target = ensureSelectedCell()
  if (!target) return
  borderDraft.value = cloneBorders(target.style.borders || defaultBorders())
  borderDialog.value = true
  closeMenu()
}

function onBorderConfirm(borders: CellBorders) {
  const target = ensureSelectedCell(true)
  if (!target) return
  target.style = { ...target.style, borders: cloneBorders(borders) }
  if (univerBridge.isReady()) univerBridge.applyBorders(borders)
}

function applyFreeze(kind: 'row' | 'column' | 'window') {
  const pos = univerBridge.getActiveCellPosition()
  if (!pos) return
  const state = univerBridge.getFreezeState()
  if (kind === 'row') {
    if (state.rows === pos.row && state.columns === 0) {
      univerBridge.unfreeze()
    } else {
      univerBridge.freezeRows(pos.row)
      univerBridge.freezeColumns(0)
    }
  } else if (kind === 'column') {
    if (state.columns === pos.column && state.rows === 0) {
      univerBridge.unfreeze()
    } else {
      univerBridge.freezeRows(0)
      univerBridge.freezeColumns(pos.column)
    }
  } else if (state.rows === pos.row && state.columns === pos.column) {
    univerBridge.unfreeze()
  } else {
    univerBridge.freezePane(pos.row, pos.column)
  }
  closeMenu()
}

function setCellType(type: ValueType, chartType?: string) {
  const target = ensureSelectedCell()
  if (!target) return
  target.valueType = type
  if (chartType) target.chartType = chartType
  store.activePanel = 'property'
  closeMenu()
}

function colorCss(value: string): string {
  return value ? `rgb(${value})` : 'transparent'
}

const applyColor = debounce((value: string) => {
  if (!univerBridge.isReady()) {
    const target = ensureSelectedCell()
    if (!target) return
    if (colorTarget.value === 'font') target.style.forecolor = value
    else target.style.bgcolor = value
    return
  }
  if (colorTarget.value === 'font') univerBridge.applyStyleToSelection({ forecolor: value })
  else univerBridge.applyStyleToSelection({ bgcolor: value })
}, 40)

function toggleMenu(name: MenuName) {
  if (name === 'fontColor' || name === 'bgColor') {
    colorTarget.value = name === 'fontColor' ? 'font' : 'bg'
  }
  activeMenu.value = activeMenu.value === name ? null : name
}

function closeMenu() {
  activeMenu.value = null
}

function onDocMouseDown(event: MouseEvent) {
  if (!activeMenu.value) return
  const target = event.target as HTMLElement | null
  const menu = target?.closest('[data-menu]')?.getAttribute('data-menu')
  if (menu === activeMenu.value) return
  closeMenu()
}

function onDocKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') closeMenu()
}

onMounted(() => {
  document.addEventListener('mousedown', onDocMouseDown, true)
  document.addEventListener('keydown', onDocKeydown)
})

onBeforeUnmount(() => {
  document.removeEventListener('mousedown', onDocMouseDown, true)
  document.removeEventListener('keydown', onDocKeydown)
})
</script>

<template>
  <div class="format-toolbar">
    <button class="fmt-btn tb-merge" title="合并/拆分单元格" @click="univerBridge.toggleMergeSelection()">
      <AppIcon name="splitMerge" />
    </button>

    <div class="tb-menu" data-menu="alignH">
      <button class="fmt-btn has-caret" title="水平对齐" @click="toggleMenu('alignH')">
        <AppIcon name="alignLeft" />
        <AppIcon name="chevronDown" :size="12" class="tb-caret" />
      </button>
      <div v-if="activeMenu === 'alignH'" class="tb-panel tb-list">
        <button v-for="item in alignHItems" :key="item.value" class="tb-item" @click="applyAlignH(item.value)">
          <AppIcon :name="item.icon" :size="16" />
          <span>{{ item.label }}</span>
        </button>
      </div>
    </div>

    <div class="tb-menu" data-menu="alignV">
      <button class="fmt-btn has-caret" title="垂直对齐" @click="toggleMenu('alignV')">
        <AppIcon name="valign" />
        <AppIcon name="chevronDown" :size="12" class="tb-caret" />
      </button>
      <div v-if="activeMenu === 'alignV'" class="tb-panel tb-list">
        <button v-for="item in alignVItems" :key="item.value" class="tb-item" @click="applyAlignV(item.value)">
          <span>{{ item.label }}</span>
        </button>
      </div>
    </div>

    <div class="tb-menu" data-menu="border">
      <button class="fmt-btn has-caret" title="边框" @click="toggleMenu('border')">
        <AppIcon name="border" />
        <AppIcon name="chevronDown" :size="12" class="tb-caret" />
      </button>
      <div v-if="activeMenu === 'border'" class="tb-panel tb-border-panel">
        <button
          v-for="item in borderItems"
          :key="item.key"
          class="tb-item"
          :class="{ active: activeBorderKey === item.key }"
          @click="item.key === 'custom' ? openCustomBorder() : applyBorder(item.key)"
        >
          <BorderSample :sides="item.sides" :color="item.key === 'none' ? '#b9c0cc' : '#0d6b5c'" />
          <span>{{ item.label }}</span>
        </button>
      </div>
    </div>

    <div class="tb-menu" data-menu="fontFamily">
      <button class="tb-text-btn" title="字体" @click="toggleMenu('fontFamily')">
        <span>{{ currentFontFamily }}</span>
        <AppIcon name="chevronDown" :size="12" class="tb-caret" />
      </button>
      <div v-if="activeMenu === 'fontFamily'" class="tb-panel tb-list tb-font-list">
        <button
          v-for="font in fontFamilies"
          :key="font"
          class="tb-item"
          :class="{ active: currentFontFamily === font }"
          :style="{ fontFamily: font }"
          @click="setFontFamily(font)"
        >
          {{ font }}
        </button>
      </div>
    </div>

    <div class="tb-menu" data-menu="fontSize">
      <button class="tb-text-btn tb-size-btn" title="字号" @click="toggleMenu('fontSize')">
        <span>{{ currentFontSize }}</span>
        <AppIcon name="chevronDown" :size="12" class="tb-caret" />
      </button>
      <div v-if="activeMenu === 'fontSize'" class="tb-panel tb-list tb-size-list">
        <button
          v-for="sizeOption in fontSizes"
          :key="sizeOption"
          class="tb-item"
          :class="{ active: currentFontSize === sizeOption }"
          @click="setFontSize(sizeOption)"
        >
          {{ sizeOption }}
        </button>
      </div>
    </div>

    <button class="fmt-btn" :class="{ active: cell?.style.bold }" title="加粗" @click="toggle('bold')"><b>B</b></button>
    <button class="fmt-btn" :class="{ active: cell?.style.italic }" title="斜体" @click="toggle('italic')"><i>I</i></button>
    <button class="fmt-btn" :class="{ active: cell?.style.underline }" title="下划线" @click="toggle('underline')"><u>U</u></button>

    <div class="tb-menu" data-menu="fontColor">
      <button class="fmt-btn fmt-color-btn" title="字体颜色" @click="toggleMenu('fontColor')">
        <span class="color-a">A</span>
        <span class="color-underline" :style="{ background: colorCss(currentFontColor) }" />
      </button>
      <div v-if="activeMenu === 'fontColor'" class="tb-panel tb-color-panel">
        <ColorPicker :model-value="currentFontColor" @change="applyColor" />
      </div>
    </div>

    <div class="tb-menu" data-menu="bgColor">
      <button class="fmt-btn fmt-color-btn" title="背景颜色" @click="toggleMenu('bgColor')">
        <AppIcon name="fill" />
        <span class="color-underline" :style="{ background: colorCss(currentBgColor) }" />
      </button>
      <div v-if="activeMenu === 'bgColor'" class="tb-panel tb-color-panel">
        <ColorPicker :model-value="currentBgColor" allow-transparent @change="applyColor" />
      </div>
    </div>

    <div class="tb-menu" data-menu="freeze">
      <button class="fmt-btn has-caret" title="冻结" @click="toggleMenu('freeze')">
        <AppIcon name="lock" />
        <AppIcon name="chevronDown" :size="12" class="tb-caret" />
      </button>
      <div v-if="activeMenu === 'freeze'" class="tb-panel tb-list">
        <button class="tb-item" @click="applyFreeze('row')">冻结行</button>
        <button class="tb-item" @click="applyFreeze('column')">冻结列</button>
        <button class="tb-item" @click="applyFreeze('window')">冻结窗口</button>
      </div>
    </div>

    <button class="fmt-btn" title="斜表头定义" @click="setCellType('diagonal')">
      <AppIcon name="diagonal" />
    </button>
    <button class="fmt-btn" title="插入图片" @click="setCellType('image')">
      <AppIcon name="image" />
    </button>

    <div class="tb-menu" data-menu="chart">
      <button class="fmt-btn has-caret tb-chart" title="图表" @click="toggleMenu('chart')">
        <AppIcon name="chartPie" />
        <AppIcon name="chevronDown" :size="12" class="tb-caret" />
      </button>
      <div v-if="activeMenu === 'chart'" class="tb-panel tb-list">
        <button
          v-for="chart in chartTypes"
          :key="chart.value"
          class="tb-item"
          @click="setCellType('chart', chart.value)"
        >
          {{ chart.label }}
        </button>
      </div>
    </div>

    <div class="tb-menu" data-menu="code">
      <button class="fmt-btn has-caret" title="二维码/条形码" @click="toggleMenu('code')">
        <AppIcon name="gridPlus" />
        <AppIcon name="chevronDown" :size="12" class="tb-caret" />
      </button>
      <div v-if="activeMenu === 'code'" class="tb-panel tb-list tb-panel-right">
        <button
          v-for="item in codeItems"
          :key="item.value"
          class="tb-item"
          @click="setCellType(item.value)"
        >
          {{ item.label }}
        </button>
      </div>
    </div>

    <BorderDialog v-model:show="borderDialog" :borders="borderDraft" @confirm="onBorderConfirm" />
  </div>
</template>
