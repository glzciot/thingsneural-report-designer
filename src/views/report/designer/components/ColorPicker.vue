<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = withDefaults(
  defineProps<{
    modelValue?: string
    allowTransparent?: boolean
  }>(),
  { modelValue: '0,0,0', allowTransparent: false },
)
const emit = defineEmits<{ (e: 'change', value: string): void }>()

const hue = ref(0)
const sat = ref(0)
const val = ref(1)
const r = ref(0)
const g = ref(0)
const b = ref(0)
const transparent = ref(false)
const square = ref<HTMLElement | null>(null)

const swatches = [
  '#c00000',
  '#ff8c00',
  '#ffd700',
  '#8b4513',
  '#7cb342',
  '#2e7d32',
  '#c2185b',
  '#9c27b0',
  '#1976d2',
  '#26c6da',
  '#a5d6a7',
  '#000000',
  '#595959',
  '#9e9e9e',
  '#ffffff',
]

const hex = computed(() => rgbToHex(r.value, g.value, b.value))
const hexText = computed({
  get: () => hex.value.slice(1).toUpperCase(),
  set: (value: string) => {
    const rgb = hexToRgb(value)
    if (rgb) {
      transparent.value = false
      applyRgb(rgb)
    }
  },
})
const squareStyle = computed(() => ({
  background: `linear-gradient(to top, #000, rgba(0,0,0,0)), linear-gradient(to right, #fff, hsl(${hue.value},100%,50%))`,
}))
const pointerStyle = computed(() => ({
  left: `${Math.round(sat.value * 100)}%`,
  top: `${Math.round((1 - val.value) * 100)}%`,
  background: `#${hex.value}`,
}))

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function rgbToHex(red: number, green: number, blue: number) {
  const toHex = (n: number) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0')
  return `#${toHex(red)}${toHex(green)}${toHex(blue)}`
}

function hexToRgb(value: string): [number, number, number] | null {
  const hexValue = value.replace('#', '').trim()
  if (!/^[0-9a-f]{3}$|^[0-9a-f]{6}$/i.test(hexValue)) return null
  const normalized =
    hexValue.length === 3
      ? hexValue
          .split('')
          .map((char) => char + char)
          .join('')
      : hexValue
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ]
}

function parseRgb(value: string): [number, number, number] | null {
  const parts = (value || '').split(',').map((item) => Number(item.trim()))
  if (parts.length !== 3 || parts.some((item) => !Number.isFinite(item))) return null
  return [clamp(parts[0], 0, 255), clamp(parts[1], 0, 255), clamp(parts[2], 0, 255)]
}

function rgbToHsv(red: number, green: number, blue: number) {
  const rn = red / 255
  const gn = green / 255
  const bn = blue / 255
  const max = Math.max(rn, gn, bn)
  const min = Math.min(rn, gn, bn)
  const delta = max - min
  let h = 0
  if (delta > 0) {
    if (max === rn) h = ((gn - bn) / delta) % 6
    else if (max === gn) h = (bn - rn) / delta + 2
    else h = (rn - gn) / delta + 4
    h *= 60
    if (h < 0) h += 360
  }
  return { h, s: max === 0 ? 0 : delta / max, v: max }
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  const c = v * s
  const x = c * (1 - Math.abs(((h / 60) % 2) - 1))
  const m = v - c
  let rgb: [number, number, number] = [0, 0, 0]
  if (h < 60) rgb = [c, x, 0]
  else if (h < 120) rgb = [x, c, 0]
  else if (h < 180) rgb = [0, c, x]
  else if (h < 240) rgb = [0, x, c]
  else if (h < 300) rgb = [x, 0, c]
  else rgb = [c, 0, x]
  return [Math.round((rgb[0] + m) * 255), Math.round((rgb[1] + m) * 255), Math.round((rgb[2] + m) * 255)]
}

function applyRgb(rgb: [number, number, number], notify = true) {
  r.value = rgb[0]
  g.value = rgb[1]
  b.value = rgb[2]
  const hsv = rgbToHsv(rgb[0], rgb[1], rgb[2])
  hue.value = hsv.h
  sat.value = hsv.s
  val.value = hsv.v
  transparent.value = false
  if (notify) emit('change', `${rgb[0]},${rgb[1]},${rgb[2]}`)
}

function applyHsv(notify = true) {
  const rgb = hsvToRgb(hue.value, sat.value, val.value)
  r.value = rgb[0]
  g.value = rgb[1]
  b.value = rgb[2]
  transparent.value = false
  if (notify) emit('change', `${rgb[0]},${rgb[1]},${rgb[2]}`)
}

function updateFromPointer(event: MouseEvent) {
  const element = square.value
  if (!element) return
  const rect = element.getBoundingClientRect()
  sat.value = clamp((event.clientX - rect.left) / rect.width, 0, 1)
  val.value = 1 - clamp((event.clientY - rect.top) / rect.height, 0, 1)
  applyHsv()
}

function onSquareDown(event: MouseEvent) {
  event.preventDefault()
  updateFromPointer(event)
  const move = (e: MouseEvent) => updateFromPointer(e)
  const up = () => {
    document.removeEventListener('mousemove', move)
    document.removeEventListener('mouseup', up)
  }
  document.addEventListener('mousemove', move)
  document.addEventListener('mouseup', up)
}

function onHue(event: Event) {
  hue.value = Number((event.target as HTMLInputElement).value)
  applyHsv()
}

function onChannel(channel: 'r' | 'g' | 'b', event: Event) {
  const value = clamp(Number((event.target as HTMLInputElement).value) || 0, 0, 255)
  if (channel === 'r') r.value = value
  else if (channel === 'g') g.value = value
  else b.value = value
  transparent.value = false
  const hsv = rgbToHsv(r.value, g.value, b.value)
  hue.value = hsv.h
  sat.value = hsv.s
  val.value = hsv.v
  emit('change', `${r.value},${g.value},${b.value}`)
}

function pick(color: string) {
  const rgb = hexToRgb(color)
  if (rgb) applyRgb(rgb)
}

function pickTransparent() {
  if (!props.allowTransparent) return
  transparent.value = true
  emit('change', '')
}

watch(
  () => props.modelValue,
  (value) => {
    if (!value) {
      if (props.allowTransparent) {
        transparent.value = true
        return
      }
      applyRgb([0, 0, 0], false)
      return
    }
    const rgb = parseRgb(value)
    if (!rgb) return
    if (`${r.value},${g.value},${b.value}` === rgb.join(',')) {
      transparent.value = false
      return
    }
    applyRgb(rgb, false)
  },
  { immediate: true },
)
</script>

<template>
  <div class="color-picker">
    <div ref="square" class="cp-square" :style="squareStyle" @mousedown="onSquareDown">
      <span class="cp-pointer" :style="pointerStyle" />
    </div>
    <div class="cp-hue-row">
      <input
        class="cp-hue"
        type="range"
        min="0"
        max="360"
        :value="hue"
        @input="onHue"
      />
      <span class="cp-preview" :style="{ background: `#${hex}` }" />
    </div>
    <div class="cp-alpha-row">
      <div class="cp-alpha" :style="{ '--cp-color': `#${hex}` }">
        <span class="cp-alpha-thumb" />
      </div>
      <span class="cp-preview cp-preview-alpha" :style="{ '--cp-color': `#${hex}` }" />
    </div>
    <div class="cp-inputs">
      <div class="cp-field cp-field-hex">
        <input :value="hexText" @change="hexText = ($event.target as HTMLInputElement).value" />
        <label>Hex</label>
      </div>
      <div class="cp-field">
        <input :value="r" type="number" min="0" max="255" @input="onChannel('r', $event)" />
        <label>R</label>
      </div>
      <div class="cp-field">
        <input :value="g" type="number" min="0" max="255" @input="onChannel('g', $event)" />
        <label>G</label>
      </div>
      <div class="cp-field">
        <input :value="b" type="number" min="0" max="255" @input="onChannel('b', $event)" />
        <label>B</label>
      </div>
      <div class="cp-field">
        <input :value="1" disabled />
        <label>A</label>
      </div>
    </div>
    <div class="cp-swatches">
      <button
        v-for="color in swatches"
        :key="color"
        class="cp-swatch"
        :style="{ background: color }"
        @click="pick(color)"
      />
      <button
        v-if="allowTransparent"
        class="cp-swatch cp-swatch-transparent"
        :class="{ active: transparent }"
        title="无填充"
        @click="pickTransparent"
      />
    </div>
  </div>
</template>
