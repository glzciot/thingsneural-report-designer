<script setup lang="ts">
import { ref } from 'vue'
import { useDesignerStore } from '@/stores'
import { notify, toReportId } from '@/utils'
import { univerBridge } from '@/univer/bridge'
import AppIcon from './AppIcon.vue'

defineProps<{ tab: 'property' | 'dataset' }>()
const emit = defineEmits<{ (e: 'update:tab', v: 'property' | 'dataset'): void }>()

const store = useDesignerStore()
const error = ref('')

async function run(fn: () => Promise<any>) {
  error.value = ''
  try {
    await fn()
  } catch (e: any) {
    error.value = e?.message || String(e)
  }
}

function openReport() {
  const input = window.prompt('请输入报表 ID', store.reportId || '')
  if (!input) return
  run(() => store.load(toReportId(input)))
}

function refresh() {
  if (!store.reportId) {
    notify.info('请先保存或加载报表')
    return
  }
  run(() => store.load(store.reportId))
}

function placeholder(name: string) {
  notify.info(`${name} 暂未实现`)
}
</script>

<template>
  <header class="app-header">
    <div class="header-actions">
      <button class="icon-btn" title="新建" @click="store.newReport()"><AppIcon name="new" /></button>
      <button class="icon-btn" title="保存" @click="run(() => store.save())"><AppIcon name="save" /></button>
      <button class="icon-btn" title="另存为" @click="run(() => store.save())"><AppIcon name="saveAs" /></button>
      <button class="icon-btn" title="打开" @click="openReport"><AppIcon name="open" /></button>
      <button class="icon-btn" title="刷新" @click="refresh"><AppIcon name="refresh" /></button>
      <span class="divider" />
      <button class="icon-btn" title="撤回" @click="run(() => univerBridge.undo())"><AppIcon name="undo" /></button>
      <button class="icon-btn" title="重做" @click="run(() => univerBridge.redo())"><AppIcon name="redo" /></button>
      <span class="divider" />
      <button class="icon-btn" title="预览" @click="run(() => store.render())"><AppIcon name="eye" /></button>
      <button class="icon-btn" title="打印预览" @click="run(() => store.render())"><AppIcon name="print" /></button>
      <button class="icon-btn" title="设置" @click="placeholder('设置')"><AppIcon name="settings" /></button>
      <button class="icon-btn" title="帮助" @click="placeholder('帮助')"><AppIcon name="help" /></button>
    </div>

    <div class="header-title">
      <span class="prefix">file:</span>
      <input
        :value="store.title"
        @input="store.setTitle(($event.target as HTMLInputElement).value)"
      />
      <span v-if="error" class="header-error">{{ error }}</span>
    </div>

    <div class="header-tabs">
      <div class="tab" :class="{ active: tab === 'property' }" @click="emit('update:tab', 'property')">属性</div>
      <div class="tab" :class="{ active: tab === 'dataset' }" @click="emit('update:tab', 'dataset')">数据集</div>
    </div>
  </header>
</template>
