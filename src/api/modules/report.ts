import { request } from '@/utils/http'

export interface Result<T = any> {
  code: number
  message?: string
  data: T
}

const base = (projectId: string) => `/web/api/v1/data/${encodeURIComponent(projectId)}/report`

async function json<T>(config: Parameters<typeof request>[0]): Promise<T> {
  const res = await request<Result<T>>(config)
  return res.data
}

export const reportApi = {
  /** 保存/新建报表 */
  save(projectId: string, dto: any) {
    return json<any>({ url: base(projectId), method: 'post', data: dto })
  },

  /** 分页查询 */
  page(projectId: string, body: any) {
    return json<any>({ url: `${base(projectId)}/page`, method: 'post', data: body })
  },

  /** 详情（含 XML） */
  get(projectId: string, id: string) {
    return json<any>({ url: `${base(projectId)}/${id}`, method: 'get', params: { projectId } })
  },

  /** 删除 */
  remove(projectId: string, id: string) {
    return json<void>({ url: `${base(projectId)}/${id}`, method: 'delete', params: { projectId } })
  },

  /** 渲染 HTML */
  render(projectId: string, id: string, options: { pageIndex?: string; parameters?: Record<string, any> } = {}) {
    return json<any>({
      url: `${base(projectId)}/${id}/render`,
      method: 'post',
      params: { pageIndex: options.pageIndex },
      data: options.parameters ?? {},
    })
  },

  /** 导出 PDF（Blob） */
  exportPdf(projectId: string, id: string, options: { paper?: string; parameters?: Record<string, any> } = {}) {
    return request<Blob>({
      url: `${base(projectId)}/${id}/export/pdf`,
      method: 'post',
      params: { paper: options.paper },
      data: options.parameters ?? {},
      responseType: 'blob',
    })
  },

  /** 导出 Excel（Blob） */
  exportExcel(projectId: string, id: string, options: { parameters?: Record<string, any> } = {}) {
    return request<Blob>({
      url: `${base(projectId)}/${id}/export/excel`,
      method: 'post',
      data: options.parameters ?? {},
      responseType: 'blob',
    })
  },
}
