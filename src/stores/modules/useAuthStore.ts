import { defineStore } from 'pinia'
import { ref } from 'vue'
import { LOCAL_STORAGE_KEYS } from '@/constants'

export const useAuthStore = defineStore('auth', () => {
  const token = ref(localStorage.getItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN) || '')

  const setToken = (value: string) => {
    token.value = value
    localStorage.setItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN, value)
  }

  const clearToken = () => {
    token.value = ''
    localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN)
  }

  const reload = () => {
    token.value = localStorage.getItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN) || ''
  }

  return { token, setToken, clearToken, reload }
})
