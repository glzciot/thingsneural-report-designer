<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import {
  defaultBorders,
  noBorders,
  type BorderSideStyle,
  type CellBorders,
} from '@/model/types'
import BorderSample from './BorderSample.vue'
import ColorPicker from './ColorPicker.vue'

const props = defineProps<{ show: boolean; borders: CellBorders }>()
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'confirm', value: CellBorders): void
}>()

const sides: Array<keyof CellBorders> = ['top', 'right', 'bottom', 'left']
const draft = ref<CellBorders>(defaultBorders())
const activeSide = ref<keyof CellBorders>('left')
const colorOpen = ref(false)

const activeBorder = computed(() => draft.value[activeSide.value])
const lineType = computed({
  get: () => activeBorder.value.style,
  set: (value: BorderSideStyle['style']) => {
    draft.value[activeSide.value] = { ...activeBorder.value, style: value }
  },
})
const size = computed({
  get: () => activeBorder.value.size,
  set: (value: number) => {
    draft.value[activeSide.value] = { ...activeBorder.value, size: Number(value) || 1 }
  },
})
const color = computed({
  get: () => activeBorder.value.color,
  set: (value: string) => {
    draft.value[activeSide.value] = { ...activeBorder.value, color: value }
  },
})

function cloneBorders(value: CellBorders): CellBorders {
  return {
    top: { ...value.top },
    right: { ...value.right },
    bottom: { ...value.bottom },
    left: { ...value.left },
  }
}

function borderCss(border: BorderSideStyle): string {
  if (border.style === 'none' || border.size <= 0) return 'none'
  return `${Math.min(border.size, 10)}px ${border.style} rgb(${border.color})`
}

const previewStyle = computed(() => ({
  borderTop: borderCss(draft.value.top),
  borderRight: borderCss(draft.value.right),
  borderBottom: borderCss(draft.value.bottom),
  borderLeft: borderCss(draft.value.left),
}))

watch(
  () => props.show,
  (show) => {
    if (!show) return
    draft.value = cloneBorders(props.borders || defaultBorders())
    colorOpen.value = false
    const preferredOrder: Array<keyof CellBorders> = ['left', 'top', 'right', 'bottom']
    const preferred = preferredOrder.find((side) => draft.value[side].style !== 'none')
    activeSide.value = preferred || 'left'
  },
)

function presetAll() {
  const template = { ...activeBorder.value }
  if (template.style === 'none') {
    draft.value = noBorders()
    return
  }
  draft.value = {
    top: { ...template },
    right: { ...template },
    bottom: { ...template },
    left: { ...template },
  }
}

function presetNone() {
  draft.value = noBorders()
}

function confirm() {
  emit('confirm', cloneBorders(draft.value))
  emit('update:show', false)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="dialog-mask" @mousedown.self="emit('update:show', false)">
      <div class="dialog-card border-dialog">
        <div class="dialog-head">
          <span>自定义单元格框线</span>
          <button class="dialog-close" @click="emit('update:show', false)">×</button>
        </div>

        <div class="dialog-body border-dialog-body">
          <div class="border-preset-row">
            <span class="border-preset-label">预设：</span>
            <button class="border-preset-btn" title="所有框线" @click="presetAll">
              <BorderSample :sides="['top', 'right', 'bottom', 'left']" />
            </button>
            <button class="border-preset-btn" title="无框线" @click="presetNone">
              <BorderSample :sides="[]" color="#b9c0cc" />
            </button>
          </div>

          <div class="border-dialog-main">
            <div class="bd-preview-wrap">
              <div class="bd-preview" :style="previewStyle">
                <span class="bd-text">文本</span>
                <span
                  v-for="side in sides"
                  :key="side"
                  class="bd-hit"
                  :class="[`hit-${side}`, { active: activeSide === side }]"
                  @click="activeSide = side"
                />
              </div>
            </div>

            <div class="bd-controls">
              <div class="bd-control-row">
                <label>线型：</label>
                <select v-model="lineType">
                  <option value="solid">实线</option>
                  <option value="dashed">虚线</option>
                  <option value="none">无</option>
                </select>
              </div>
              <div class="bd-control-row">
                <label>尺寸：</label>
                <select v-model.number="size">
                  <option v-for="n in 10" :key="n" :value="n">{{ n }}</option>
                </select>
              </div>
              <div class="bd-control-row">
                <label>颜色：</label>
                <div class="bd-color-wrap">
                  <button
                    class="bd-color-swatch"
                    :style="{ background: `rgb(${activeBorder.color})` }"
                    @click="colorOpen = !colorOpen"
                  />
                  <div v-if="colorOpen" class="bd-color-pop">
                    <ColorPicker :model-value="activeBorder.color" @change="color = $event" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div class="dialog-footer">
          <button @click="emit('update:show', false)">取消</button>
          <button class="primary" @click="confirm">确定</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
