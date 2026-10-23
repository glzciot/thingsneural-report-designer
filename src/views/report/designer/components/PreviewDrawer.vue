<script setup lang="ts">
import { onBeforeUnmount, watch } from 'vue'
import { useDesignerStore } from '@/stores'

const store = useDesignerStore()
const STYLE_ID = 'luck-report-preview-style'

function applyStyle(css: string) {
  let el = document.getElementById(STYLE_ID) as HTMLStyleElement | null
  if (!el) {
    el = document.createElement('style')
    el.id = STYLE_ID
    document.head.appendChild(el)
  }
  el.textContent = css || ''
}

watch(
  () => store.previewStyle,
  (css) => applyStyle(css),
)

onBeforeUnmount(() => {
  document.getElementById(STYLE_ID)?.remove()
})

async function prevPage() {
  await store.render(String(Math.max(store.previewPageIndex - 1, 0)))
}

async function nextPage() {
  await store.render(String(store.previewPageIndex + 1))
}
</script>

<template>
  <div v-if="store.previewOpen" class="preview-mask">
    <div class="preview-dialog">
      <div class="preview-head">
        <strong>{{ store.title }}</strong>
        <span class="meta">第 {{ store.previewPageIndex + 1 }} / {{ store.previewTotalPage || 1 }} 页</span>
        <span class="spacer" style="flex: 1"></span>
        <button :disabled="store.loading || store.previewPageIndex <= 0" @click="prevPage">上一页</button>
        <button
          :disabled="store.loading || store.previewPageIndex + 1 >= store.previewTotalPage"
          @click="nextPage"
        >
          下一页
        </button>
        <button :disabled="store.loading" @click="store.exportPdf()">导出 PDF</button>
        <button :disabled="store.loading" @click="store.exportExcel()">导出 Excel</button>
        <button @click="store.previewOpen = false">关闭</button>
      </div>
      <div class="preview-body">
        <div v-html="store.previewHtml"></div>
      </div>
    </div>
  </div>
</template>
