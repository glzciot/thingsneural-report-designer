<script setup lang="ts">
import { computed, ref, watch } from 'vue'

const props = defineProps<{
  show: boolean
  mode: 'row' | 'column'
}>()
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'confirm', count: number): void
}>()

const count = ref(1)
const title = computed(() => (props.mode === 'row' ? '插入行' : '插入列'))
const label = computed(() => (props.mode === 'row' ? '行数' : '列数'))

watch(
  () => props.show,
  (show) => {
    if (show) count.value = 1
  },
)

function adjust(delta: number) {
  count.value = Math.max(1, (Number(count.value) || 1) + delta)
}

function confirm() {
  emit('confirm', Math.max(1, Math.round(Number(count.value) || 1)))
  emit('update:show', false)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="dialog-mask" @mousedown.self="emit('update:show', false)">
      <div class="dialog-card insert-dialog">
        <div class="dialog-head">
          <span>{{ title }}</span>
          <button class="dialog-close" @click="emit('update:show', false)">×</button>
        </div>
        <div class="dialog-body">
          <div class="insert-form">
            <span class="insert-label"><em>*</em>{{ label }}：</span>
            <div class="stepper insert-stepper">
              <button type="button" class="stepper-btn" @click="adjust(-1)">−</button>
              <input v-model.number="count" type="number" min="1" step="1" />
              <button type="button" class="stepper-btn" @click="adjust(1)">+</button>
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
