import { LOCAL_STORAGE_KEYS } from '@/constants'

const DEFAULT_PROJECT_ID = import.meta.env.VITE_DEFAULT_PROJECT_ID || ''
const DEFAULT_PROJECT_NAME = import.meta.env.VITE_DEFAULT_PROJECT_NAME || '默认项目'
const DEFAULT_TOKEN = import.meta.env.VITE_DEFAULT_TOKEN || ''

/** 当前登录 token（由 thingsNeural-front 写入；开发环境可用 .env 默认值） */
export function getAuthToken(): string {
  const stored = localStorage.getItem(LOCAL_STORAGE_KEYS.AUTH_TOKEN) || ''
  if (stored) return stored
  return import.meta.env.DEV ? DEFAULT_TOKEN : ''
}

/** 当前项目对象（由 thingsNeural-front 写入；开发环境可用 .env 默认值） */
export function getCurrentProject(): any {
  try {
    const raw = localStorage.getItem(LOCAL_STORAGE_KEYS.CURRENT_PROJECT)
    if (raw) return JSON.parse(raw)
  } catch {
    // 忽略本地存储解析失败，继续使用开发默认项目
  }
  if (import.meta.env.DEV && DEFAULT_PROJECT_ID) {
    return { id: DEFAULT_PROJECT_ID, name: DEFAULT_PROJECT_NAME }
  }
  return null
}

/** 当前项目 ID */
export function getCurrentProjectId(): string {
  const project = getCurrentProject()
  return project?.id ?? ''
}

/** 从 `db:{id}` 或纯 id 中取报表 ID */
export function toReportId(value: string): string {
  const v = (value || '').trim()
  if (v.startsWith('db:')) return v.slice(3)
  return v
}
