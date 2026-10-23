import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import { LOCAL_STORAGE_KEYS } from '@/constants'

function readProject(): any {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_PROJECT)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

export const useProjectStore = defineStore('project', () => {
  const project = ref<any>(readProject())
  const projectId = computed<string>(() => project.value?.id || '')

  const reload = () => {
    project.value = readProject()
  }

  return { project, projectId, reload }
})
