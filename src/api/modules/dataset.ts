import { request } from '@/utils/http'
import type { Result } from './report'

export interface DatasetColumnField {
  fieldName: string
  fieldLabel?: string
  fieldType?: string
  visible?: boolean
  enumMap?: Record<string, string>
}

export interface DatasetParamField {
  param: string
  paramLabel?: string
  fieldType?: string
  defaultValue?: string
  value?: string
}

export interface DatasetVo {
  id: string
  name: string
  type?: string
  querySql?: string
  datasourceId?: string
  columnFields?: DatasetColumnField[]
  paramFields?: DatasetParamField[]
  updateTime?: string
}

export interface PageResult<T> {
  records: T[]
  total: number | string
  size: number | string
  current: number | string
}

const base = (projectId: string) => `/web/api/v1/data/${encodeURIComponent(projectId)}/dataset`

async function json<T>(config: Parameters<typeof request>[0]): Promise<T> {
  const res = await request<Result<T>>(config)
  return res.data
}

export const datasetApi = {
  page(projectId: string, body: { current: number; pageSize: number; query?: Record<string, any> }) {
    return json<PageResult<DatasetVo>>({
      url: `${base(projectId)}/page`,
      method: 'post',
      data: body,
    })
  },
}
