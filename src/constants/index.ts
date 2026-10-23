export { LOCAL_STORAGE_KEYS } from './storage'

/** 数据集聚合方式（下拉展示） */
export const AGGREGATE_OPTIONS = [
  { label: '列表', value: 'select' },
  { label: '分组', value: 'group' },
  { label: '汇总', value: 'sum' },
  { label: '统计数量', value: 'count' },
  { label: '最大值', value: 'max' },
  { label: '最小值', value: 'min' },
  { label: '平均值', value: 'avg' },
] as const

/** 展开方向 */
export const EXPAND_OPTIONS = [
  { label: '不展开', value: 'None' },
  { label: '向下', value: 'Down' },
  { label: '向右', value: 'Right' },
] as const

/** 排序 */
export const ORDER_OPTIONS = [
  { label: '不排序', value: 'none' },
  { label: '正序', value: 'asc' },
  { label: '倒序', value: 'desc' },
] as const
