<script setup lang="ts">
import { computed, ref } from 'vue'
import { useDesignerStore } from '@/stores'
import { notify } from '@/utils'
import type { DatasetVo } from '@/api'
import type { DatasetModel } from '@/model/types'
import AppIcon from './AppIcon.vue'
import DatasetPickerDialog from './DatasetPickerDialog.vue'

const store = useDesignerStore()
const pickerOpen = ref(false)
const expanded = ref<Record<string, boolean>>({})

const PARAM_TYPE_MAP: Record<string, string> = {
  TEXT: 'String',
  TIME: 'Date',
  NUMBER: 'Float',
}

const existingIds = computed(() =>
  store.model.datasets.map((dataset) => dataset.id).filter((id): id is string => !!id),
)

function datasetKey(dataset: DatasetModel, index: number): string {
  return dataset.id || dataset.name || String(index)
}

function isExpanded(dataset: DatasetModel, index: number): boolean {
  return !!expanded.value[datasetKey(dataset, index)]
}

function toggleDataset(dataset: DatasetModel, index: number) {
  const key = datasetKey(dataset, index)
  expanded.value[key] = !expanded.value[key]
}

function removeDataset(index: number) {
  store.model.datasets.splice(index, 1)
}

function onConfirm(list: DatasetVo[]) {
  let added = 0
  let skipped = 0
  for (const source of list) {
    if (String(source.type || 'SQL').toUpperCase() === 'API') continue
    if (
      store.model.datasets.some(
        (item) => (item.id && item.id === source.id) || item.name === source.name,
      )
    ) {
      continue
    }
    const fields = (source.columnFields || [])
      .map((field) => field.fieldName)
      .filter(Boolean)
    if (!source.querySql || !fields.length) {
      skipped += 1
      continue
    }
    const labels: Record<string, string> = {}
    for (const field of source.columnFields || []) {
      if (field.fieldLabel && field.fieldLabel !== field.fieldName) {
        labels[field.fieldName] = field.fieldLabel
      }
    }
    store.model.datasets.push({
      id: source.id,
      name: source.name,
      sql: source.querySql || '',
      managed: true,
      fields,
      parameters: (source.paramFields || [])
        .map((param) => ({
          name: param.param,
          type: PARAM_TYPE_MAP[String(param.fieldType || 'TEXT').toUpperCase()] || 'String',
          defaultValue: param.defaultValue || '',
        }))
        .filter((param) => param.name),
      fieldLabels: labels,
      datasourceId: source.datasourceId,
    })
    added += 1
  }
  notify.success(`已添加 ${added} 个数据集`)
  if (skipped > 0) {
    notify.warning(`${skipped} 个数据集缺少 SQL 或字段，已跳过`)
  }
}
</script>

<template>
  <div class="sidebar-body">
    <div class="ds-toolbar">
      <span class="ds-title">数据集</span>
      <button class="add-dataset-btn" @click="pickerOpen = true">+ 添加数据集</button>
    </div>

    <div v-if="!store.model.datasets.length" class="ds-empty">
      暂无数据集，点击右上角「添加数据集」
    </div>

    <div v-else class="ds-tree">
      <div
        v-for="(dataset, index) in store.model.datasets"
        :key="datasetKey(dataset, index)"
        class="ds-node"
      >
        <div class="ds-node-head" @click="toggleDataset(dataset, index)">
          <span class="ds-caret">{{ isExpanded(dataset, index) ? '▾' : '▸' }}</span>
          <AppIcon name="dataset" :size="14" />
          <span class="node-label">{{ dataset.name }}</span>
          <span class="ds-field-count">{{ dataset.fields.length }}</span>
          <button class="ds-remove" title="移除数据集" @click.stop="removeDataset(index)">×</button>
        </div>
        <div v-if="isExpanded(dataset, index)" class="ds-fields">
          <div v-for="field in dataset.fields" :key="field" class="ds-field">
            <span class="field-label">{{ dataset.fieldLabels?.[field] || field }}</span>
            <span v-if="dataset.fieldLabels?.[field]" class="field-name">{{ field }}</span>
          </div>
          <div v-if="!dataset.fields.length" class="empty-tip">暂无字段</div>
        </div>
      </div>
    </div>

    <DatasetPickerDialog
      v-model:show="pickerOpen"
      :existing-ids="existingIds"
      @confirm="onConfirm"
    />
  </div>
</template>
