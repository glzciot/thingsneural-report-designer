<script setup lang="ts">
import { ref, watch } from 'vue'
import type { CellConditionModel, ConditionPropertyModel } from '@/model/types'

const props = defineProps<{ show: boolean; items: ConditionPropertyModel[] }>()
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'save', value: ConditionPropertyModel[]): void
}>()

const OP_OPTIONS = [
  { value: 'GreatThen', label: '大于 (>)' },
  { value: 'EqualsGreatThen', label: '大于等于 (≥)' },
  { value: 'LessThen', label: '小于 (<)' },
  { value: 'EqualsLessThen', label: '小于等于 (≤)' },
  { value: 'Equals', label: '等于 (==)' },
  { value: 'NotEquals', label: '不等于 (!=)' },
  { value: 'In', label: '包含于 (In)' },
  { value: 'Like', label: '模糊匹配 (Like)' },
  { value: 'NotIn', label: '不包含于 (NotIn)' },
]

const item = ref<ConditionPropertyModel>(createEmpty())

function createEmpty(): ConditionPropertyModel {
  return {
    name: 'condition1',
    newValue: '',
    linkUrl: '',
    linkTargetWindow: '_blank',
    type: 'normal',
    conditions: [{ property: '', op: 'Equals', value: '' }],
  }
}

watch(
  () => props.show,
  (show) => {
    if (!show) return
    const source = props.items?.[0]
    item.value = source
      ? {
          ...source,
          conditions: (source.conditions || []).map((c) => ({ ...c })),
        }
      : createEmpty()
  },
)

function addCondition() {
  item.value.conditions.push({ property: '', op: 'Equals', value: '' })
}

function removeCondition(index: number) {
  item.value.conditions.splice(index, 1)
}

function save() {
  const conditions = item.value.conditions.filter(
    (c: CellConditionModel) => c.property || c.value,
  )
  if (!conditions.length && !item.value.newValue && !item.value.linkUrl) {
    emit('save', [])
  } else {
    emit('save', [{ ...item.value, conditions: conditions.map((c) => ({ ...c })) }])
  }
  emit('update:show', false)
}
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="dialog-mask" @mousedown.self="emit('update:show', false)">
      <div class="dialog-card dialog-wide">
        <div class="dialog-head">
          <span>条件属性配置</span>
          <button class="dialog-close" @click="emit('update:show', false)">×</button>
        </div>
        <div class="dialog-body">
          <div class="dialog-form-row">
            <label>条件名</label>
            <input v-model="item.name" placeholder="condition1" />
            <label>类型</label>
            <select v-model="item.type">
              <option value="normal">normal</option>
              <option value="expr">expr</option>
            </select>
          </div>
          <div class="dialog-form-row">
            <label>命中新值</label>
            <input v-model="item.newValue" placeholder="满足条件后替换的值" />
            <label>链接地址</label>
            <input v-model="item.linkUrl" placeholder="满足条件后跳转地址" />
          </div>
          <div class="dialog-form-row">
            <label>目标窗口</label>
            <select v-model="item.linkTargetWindow">
              <option value="_blank">新窗口</option>
              <option value="_self">当前窗口</option>
            </select>
          </div>

          <div class="dialog-subtitle">条件列表</div>
          <div v-for="(cond, index) in item.conditions" :key="index" class="condition-row">
            <input v-model="cond.property" placeholder="属性/单元格/@（当前值）" />
            <select v-model="cond.op">
              <option v-for="op in OP_OPTIONS" :key="op.value" :value="op.value">{{ op.label }}</option>
            </select>
            <input v-model="cond.value" placeholder="比较值" />
            <button class="dialog-danger" @click="removeCondition(index)">删除</button>
          </div>
          <div v-if="!item.conditions.length" class="empty-tip">暂无条件</div>
          <button class="dialog-add" @click="addCondition">+ 添加条件</button>
        </div>
        <div class="dialog-footer">
          <button @click="emit('update:show', false)">取消</button>
          <button class="primary" @click="save">保存</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>
