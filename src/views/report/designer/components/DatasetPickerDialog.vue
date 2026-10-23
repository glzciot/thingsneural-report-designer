<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import dayjs from 'dayjs'
import { datasetApi, type DatasetVo } from '@/api'
import { getCurrentProjectId, notify } from '@/utils'

const props = defineProps<{ show: boolean; existingIds?: string[] }>()
const emit = defineEmits<{
  (e: 'update:show', value: boolean): void
  (e: 'confirm', value: DatasetVo[]): void
}>()

const keyword = ref('')
const current = ref(1)
const pageSize = ref(10)
const total = ref(0)
const records = ref<DatasetVo[]>([])
const loading = ref(false)
const selected = ref<Record<string, DatasetVo>>({})

const existingSet = computed(() => new Set(props.existingIds || []))
const selectedList = computed(() => Object.values(selected.value))
const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize.value)))
const allPageSelected = computed(() => {
  const list = records.value.filter((ds) => isSelectable(ds))
  return list.length > 0 && list.every((ds) => !!selected.value[ds.id])
})

function isSelectable(ds: DatasetVo): boolean {
  return (
    String(ds.type || 'SQL').toUpperCase() !== 'API' &&
    !existingSet.value.has(ds.id) &&
    !!ds.querySql &&
    fieldCount(ds) > 0
  )
}

function typeLabel(type?: string): string {
  return String(type || 'SQL').toUpperCase() === 'API' ? 'API' : 'SQL'
}

function fieldCount(ds: DatasetVo): number {
  return ds.columnFields?.length || 0
}

function formatTime(value?: string): string {
  return value ? dayjs(value).format('YYYY-MM-DD HH:mm') : '-'
}

function toggle(ds: DatasetVo) {
  if (!isSelectable(ds)) return
  if (selected.value[ds.id]) {
    delete selected.value[ds.id]
  } else {
    selected.value[ds.id] = ds
  }
}

function toggleAll(event: Event) {
  const checked = (event.target as HTMLInputElement).checked
  records.value.forEach((ds) => {
    if (!isSelectable(ds)) return
    if (checked) selected.value[ds.id] = ds
    else delete selected.value[ds.id]
  })
}

async function load(page = 1) {
  const projectId = getCurrentProjectId()
  if (!projectId) {
    notify.error('未获取到当前项目')
    return
  }
  loading.value = true
  try {
    const res = await datasetApi.page(projectId, {
      current: page,
      pageSize: pageSize.value,
      query: { keyword: keyword.value.trim() },
    })
    records.value = res.records || []
    total.value = Number(res.total || 0)
    current.value = Number(res.current || page)
  } catch {
    records.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

function confirm() {
  if (!selectedList.value.length) {
    notify.info('请选择数据集')
    return
  }
  emit('confirm', selectedList.value)
  emit('update:show', false)
}

watch(
  () => props.show,
  (show) => {
    if (!show) return
    selected.value = {}
    keyword.value = ''
    current.value = 1
    load(1)
  },
)
</script>

<template>
  <Teleport to="body">
    <div v-if="show" class="dialog-mask" @mousedown.self="emit('update:show', false)">
      <div class="dialog-card dataset-picker-dialog">
        <div class="dialog-head">
          <span>添加数据集</span>
          <button class="dialog-close" @click="emit('update:show', false)">×</button>
        </div>

        <div class="picker-toolbar">
          <input
            v-model="keyword"
            placeholder="搜索数据集名称"
            @keyup.enter="load(1)"
          />
          <button class="section-btn" @click="load(1)">查询</button>
          <span class="picker-tip">仅支持有 SQL 和字段的数据集</span>
        </div>

        <div class="picker-body">
          <table class="picker-table">
            <thead>
              <tr>
                <th class="col-check">
                  <input type="checkbox" :checked="allPageSelected" @change="toggleAll" />
                </th>
                <th>名称</th>
                <th class="col-type">类型</th>
                <th class="col-count">字段数</th>
                <th>更新时间</th>
                <th class="col-status">状态</th>
              </tr>
            </thead>
            <tbody>
              <tr v-if="loading">
                <td colspan="6" class="picker-empty">加载中…</td>
              </tr>
              <tr v-else-if="!records.length">
                <td colspan="6" class="picker-empty">暂无数据集</td>
              </tr>
              <template v-else>
                <tr
                  v-for="ds in records"
                  :key="ds.id"
                  :class="{ selected: !!selected[ds.id], muted: !isSelectable(ds) }"
                  @click="toggle(ds)"
                >
                  <td class="col-check">
                    <input
                      type="checkbox"
                      :checked="!!selected[ds.id]"
                      :disabled="!isSelectable(ds)"
                      @click.stop="toggle(ds)"
                    />
                  </td>
                  <td>{{ ds.name }}</td>
                  <td>{{ typeLabel(ds.type) }}</td>
                  <td>{{ fieldCount(ds) }}</td>
                  <td>{{ formatTime(ds.updateTime) }}</td>
                  <td>
                    <span v-if="existingSet.has(ds.id)" class="picker-tag">已添加</span>
                    <span
                      v-else-if="String(ds.type || 'SQL').toUpperCase() === 'API'"
                      class="picker-tag muted"
                    >
                      仅 SQL
                    </span>
                    <span v-else-if="!ds.querySql" class="picker-tag muted">无 SQL</span>
                    <span v-else-if="!fieldCount(ds)" class="picker-tag muted">无字段</span>
                    <span v-else-if="selected[ds.id]" class="picker-tag active">已选</span>
                  </td>
                </tr>
              </template>
            </tbody>
          </table>
        </div>

        <div class="picker-footer">
          <span class="picker-summary">已选 {{ selectedList.length }} 个</span>
          <div class="picker-pager">
            <button :disabled="current <= 1 || loading" @click="load(current - 1)">上一页</button>
            <span>{{ current }} / {{ totalPages }}</span>
            <button :disabled="current >= totalPages || loading" @click="load(current + 1)">下一页</button>
          </div>
          <div class="picker-actions">
            <button @click="emit('update:show', false)">取消</button>
            <button class="primary" @click="confirm">确定</button>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>
