<script setup lang="ts">
import { ref, watch } from 'vue'
import type { LinkParameterModel } from '@/model/types'

const props = defineProps<{ show: boolean; params: LinkParameterModel[] }>()
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'save', value: LinkParameterModel[]): void
}>()

const rows = ref<LinkParameterModel[]>([])

watch(
  () => props.show,
  (show) => {
    if (show) rows.value = (props.params || []).map((p) => ({ ...p }))
  },
)

function add() {
  rows.value.push({ name: '', value: '' })
}

function remove(index: number) {
  rows.value.splice(index, 1)
}

function save() {
  emit(
    'save',
    rows.value.filter((row) => row.name).map((row) => ({ ...row })),
  )
  emit('update:show', false)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="dialog-mask" @mousedown.self="emit('update:show', false)">
      <div class="dialog-card">
        <div class="dialog-head">
          <span>URL 参数配置</span>
          <button class="dialog-close" @click="emit('update:show', false)">×</button>
        </div>
        <div class="dialog-body">
          <div v-for="(row, index) in rows" :key="index" class="param-row">
            <input v-model="row.name" placeholder="参数名" />
            <input v-model="row.value" placeholder="参数值，支持表达式" />
            <button class="dialog-danger" @click="remove(index)">删除</button>
          </div>
          <div v-if="!rows.length" class="empty-tip">暂无 URL 参数</div>
          <button class="dialog-add" @click="add">+ 添加参数</button>
        </div>
        <div class="dialog-footer">
          <button @click="emit('update:show', false)">取消</button>
          <button class="primary" @click="save">保存</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
