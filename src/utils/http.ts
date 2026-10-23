import axios from 'axios'
import type { AxiosRequestConfig } from 'axios'
import { createDiscreteApi } from 'naive-ui'
import { LOCAL_STORAGE_KEYS } from '@/constants'
import { getAuthToken, getCurrentProjectId } from './helper'

let messageApi: ReturnType<typeof createDiscreteApi>['message'] | null = null

function showError(msg: string) {
  if (!messageApi) {
    messageApi = createDiscreteApi(['message']).message
  }
  messageApi.error(msg)
}

const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '',
  timeout: 120000,
  headers: { 'Content-Type': 'application/json' },
})

instance.interceptors.request.use((config) => {
  const token = getAuthToken()
  if (token) {
    config.headers.Authorization = token.startsWith('Bearer ') ? token : `Bearer ${token}`
  }
  const projectId = getCurrentProjectId()
  if (projectId) {
    config.headers['project-id'] = projectId
  }
  config.headers['X-Lang'] = 'zh-CN'
  return config
})

instance.interceptors.response.use(
  (response) => {
    const data = response.data
    if (data instanceof Blob) {
      return response
    }
    if (data && typeof data === 'object' && 'code' in data) {
      const code = (data as any).code
      if (code === 401) {
        localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN)
        showError('登录已过期，请重新从平台进入')
        return Promise.reject(new Error('登录已过期'))
      }
      if (code !== 200) {
        const msg = (data as any).message || '操作失败'
        showError(msg)
        return Promise.reject(new Error(msg))
      }
    }
    return response
  },
  (error) => {
    const status = error?.response?.status
    if (status === 401) {
      localStorage.removeItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN)
      showError('登录已过期，请重新从平台进入')
    } else if (status === 403) {
      showError('没有权限访问')
    } else if (status === 502) {
      showError('网关错误：后端服务暂不可用')
    } else {
      showError(error?.response?.data?.message || error?.message || '请求失败')
    }
    return Promise.reject(error)
  },
)

/** 统一请求：返回响应体（JSON 为 Result 对象，二进制为 Blob） */
export async function request<T = any>(config: AxiosRequestConfig): Promise<T> {
  const response = await instance.request(config)
  return response.data as T
}

export { instance as http }
