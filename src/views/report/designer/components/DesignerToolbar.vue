<script setup lang="ts">
import { ref } from 'vue'
import { useAuthStore, useDesignerStore, useProjectStore } from '@/stores'
import { toReportId } from '@/utils'

const store = useDesignerStore()
const projectStore = useProjectStore()
const authStore = useAuthStore()

const loadId = ref('')
const error = ref('')

async function run(fn: () => Promise<any>) {
  error.value = ''
  try {
    await fn()
  } catch (e: any) {
    error.value = e?.message || String(e)
  }
}

function load() {
  const id = toReportId(loadId.value)
  if (!id) {
    error.value = '请输入报表 ID'
    return
  }
  run(() => store.load(id))
}
</script>

<template>
  <div class="toolbar">
    <strong>报表设计器</strong>
    <span class="meta">项目：{{ projectStore.project?.name || projectStore.projectId || '未选择' }}</span>
    <span v-if="!authStore.token" class="meta">（未检测到登录 token，保存/预览会失败）</span>

    <label>标题</label>
    <input
      class="field"
      :value="store.title"
      style="width: 180px"
      @input="store.setTitle(($event.target as HTMLInputElement).value)"
    />

    <label>报表ID</label>
    <input v-model="loadId" class="field" placeholder="加载已有报表" style="width: 180px" />
    <button :disabled="store.loading || !loadId" @click="load">加载</button>

    <span class="spacer"></span>

    <button :disabled="store.loading" @click="store.newReport()">新建</button>
    <button class="primary" :disabled="store.loading" @click="run(() => store.save())">保存</button>
    <button :disabled="store.loading" @click="run(() => store.render())">预览</button>
    <button :disabled="store.loading" @click="run(() => store.exportPdf())">导出 PDF</button>
    <button :disabled="store.loading" @click="run(() => store.exportExcel())">导出 Excel</button>

    <span v-if="error" class="error">{{ error }}</span>
  </div>
</template>
