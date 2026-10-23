<script setup lang="ts">
import { onMounted } from 'vue'
import { useDesignerStore } from '@/stores'
import DesignerLayout from '@/layouts/DesignerLayout.vue'
import DesignerHeader from './components/DesignerHeader.vue'
import FormatToolbar from './components/FormatToolbar.vue'
import UniverSheet from './components/UniverSheet.vue'
import CellPropertyPanel from './components/CellPropertyPanel.vue'
import DatasetPanel from './components/DatasetPanel.vue'
import PreviewDrawer from './components/PreviewDrawer.vue'

const store = useDesignerStore()

if (import.meta.env.DEV) {
  ;(window as any).__designer = store
}

onMounted(() => {
  store.ensureCell('A1', 1, 1)
})
</script>

<template>
  <DesignerLayout>
    <DesignerHeader v-model:tab="store.activePanel" />
    <FormatToolbar />
    <div class="workbench">
      <div class="canvas">
        <UniverSheet />
      </div>
      <aside class="sidebar">
        <CellPropertyPanel v-if="store.activePanel === 'property'" />
        <DatasetPanel v-else />
      </aside>
    </div>
    <PreviewDrawer />
  </DesignerLayout>
</template>
