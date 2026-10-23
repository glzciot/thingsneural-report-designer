export type Expand = 'None' | 'Down' | 'Right'
export type BorderLineStyle = 'solid' | 'dashed' | 'none'
export interface BorderSideStyle {
  style: BorderLineStyle
  size: number
  color: string
}
export interface CellBorders {
  top: BorderSideStyle
  right: BorderSideStyle
  bottom: BorderSideStyle
  left: BorderSideStyle
}
export type ValueType =
  | 'simple'
  | 'expression'
  | 'dataset'
  | 'image'
  | 'diagonal'
  | 'qrcode'
  | 'barcode'
  | 'chart'
export type SourceType = 'text' | 'expression'
export type ConditionOp =
  | 'GreatThen'
  | 'EqualsGreatThen'
  | 'LessThen'
  | 'EqualsLessThen'
  | 'Equals'
  | 'NotEquals'
  | 'In'
  | 'Like'
  | 'NotIn'
export type Aggregate =
  | 'select'
  | 'group'
  | 'sum'
  | 'count'
  | 'max'
  | 'min'
  | 'avg'
export type Order = 'none' | 'asc' | 'desc'
export type RowBand = 'title' | 'headerrepeat' | 'summary' | 'footerrepeat'

export interface CellStyleModel {
  fontSize: number
  fontFamily: string
  bold: boolean
  italic: boolean
  underline: boolean
  align: 'left' | 'center' | 'right'
  valign: 'top' | 'middle' | 'bottom'
  /** "r,g,b" */
  forecolor: string
  /** "r,g,b"，空表示透明 */
  bgcolor: string
  /** 数字/日期格式化 */
  format: string
  /** 文本行高（字号倍数） */
  lineHeight: number
  /** 内容自动换行并计算行高 */
  wrapCompute: boolean
  borders: CellBorders
}

export interface DatasetParameterModel {
  name: string
  type?: string
  defaultValue?: string
}

export interface DatasetModel {
  name: string
  sql: string
  fields: string[]
  parameters?: DatasetParameterModel[]
  /** true=新规范，SQL/连接由后端按名称解析；false/空=旧格式内嵌 SQL */
  managed?: boolean
  id?: string
  datasourceId?: string
  fieldLabels?: Record<string, string>
}

export interface DatasourceModel {
  name: string
  driver: string
  url: string
  username: string
  password: string
}

export interface PaperModel {
  type: string
  orientation: string
  pagingMode: string
}

export interface LinkParameterModel {
  name: string
  value: string
}

export interface CellConditionModel {
  property: string
  op: ConditionOp
  value: string
}

export interface ConditionPropertyModel {
  name: string
  newValue: string
  linkUrl: string
  linkTargetWindow: string
  type: 'normal' | 'expr'
  conditions: CellConditionModel[]
}

export interface SlashItemModel {
  text: string
  x: number
  y: number
  degree: number
}

export interface CellModel {
  name: string
  row: number
  col: number
  rowSpan: number
  colSpan: number
  expand: Expand
  /** 'root'=默认无父格；空=沿用引擎默认；其它=指定格名 */
  leftParent: string
  topParent: string
  valueType: ValueType
  text: string
  expression: string
  datasetName: string
  aggregate: Aggregate
  property: string
  order: Order
  style: CellStyleModel
  fillBlankRows: boolean
  multiple: number
  linkUrl: string
  linkTargetWindow: string
  linkParameters: LinkParameterModel[]
  conditionProperties: ConditionPropertyModel[]
  imageSource: SourceType
  imageValue: string
  imageWidth: number
  imageHeight: number
  zxingSource: SourceType
  zxingValue: string
  zxingWidth: number
  zxingHeight: number
  zxingFormat: string
  zxingCodeDisplay: boolean
  slashItems: SlashItemModel[]
  chartType: string
  chartDatasetName: string
  chartCategoryProperty: string
  chartSeriesProperty: string
  chartValueProperty: string
  chartCollectType: string
}

export interface ReportState {
  title: string
  rows: number
  cols: number
  rowHeights: number[]
  colWidths: number[]
  rowBands: Record<number, RowBand>
  cells: Record<string, CellModel>
  datasets: DatasetModel[]
  datasource: DatasourceModel
  paper: PaperModel
}

export function borderSide(
  style: BorderLineStyle = 'solid',
  size = 1,
  color = '0,0,0',
): BorderSideStyle {
  return { style, size, color }
}

export function defaultBorders(): CellBorders {
  return {
    top: borderSide(),
    right: borderSide(),
    bottom: borderSide(),
    left: borderSide(),
  }
}

export function noBorders(): CellBorders {
  return {
    top: borderSide('none', 0),
    right: borderSide('none', 0),
    bottom: borderSide('none', 0),
    left: borderSide('none', 0),
  }
}

export function defaultStyle(): CellStyleModel {
  return {
    fontSize: 10,
    fontFamily: '宋体',
    bold: false,
    italic: false,
    underline: false,
    align: 'center',
    valign: 'middle',
    forecolor: '0,0,0',
    bgcolor: '',
    format: '',
    lineHeight: 1,
    wrapCompute: false,
    borders: defaultBorders(),
  }
}

export function createCell(name: string, row: number, col: number): CellModel {
  return {
    name,
    row,
    col,
    rowSpan: 1,
    colSpan: 1,
    expand: 'None',
    leftParent: 'root',
    topParent: 'root',
    valueType: 'simple',
    text: '',
    expression: '',
    datasetName: '',
    aggregate: 'group',
    property: '',
    order: 'none',
    style: defaultStyle(),
    fillBlankRows: false,
    multiple: 0,
    linkUrl: '',
    linkTargetWindow: '_blank',
    linkParameters: [],
    conditionProperties: [],
    imageSource: 'text',
    imageValue: '',
    imageWidth: 0,
    imageHeight: 0,
    zxingSource: 'text',
    zxingValue: '',
    zxingWidth: 95,
    zxingHeight: 22,
    zxingFormat: '',
    zxingCodeDisplay: true,
    slashItems: [{ text: '项目1', x: 76, y: 8, degree: 4 }],
    chartType: 'bar',
    chartDatasetName: '',
    chartCategoryProperty: '',
    chartSeriesProperty: '',
    chartValueProperty: '',
    chartCollectType: 'select',
  }
}

export function colName(col: number): string {
  let n = col
  let s = ''
  while (n > 0) {
    const m = (n - 1) % 26
    s = String.fromCharCode(65 + m) + s
    n = Math.floor((n - 1) / 26)
  }
  return s
}

export function cellName(row: number, col: number): string {
  return `${colName(col)}${row}`
}

export function parseCellName(name: string): { row: number; col: number } | null {
  const match = /^([A-Z]+)(\d+)$/.exec(name || '')
  if (!match) return null
  let col = 0
  for (const ch of match[1]) col = col * 26 + (ch.charCodeAt(0) - 64)
  return { row: Number(match[2]), col }
}

export function emptyReport(): ReportState {
  const rows = 10
  const cols = 8
  return {
    title: '新建报表',
    rows,
    cols,
    rowHeights: Array.from({ length: rows }, () => 18),
    colWidths: Array.from({ length: cols }, () => 80),
    rowBands: {},
    cells: {},
    datasets: [],
    datasource: {
      name: 'datasource',
      driver: 'com.mysql.cj.jdbc.Driver',
      url: '',
      username: '',
      password: '',
    },
    paper: { type: 'A4', orientation: 'portrait', pagingMode: 'fitpage' },
  }
}
