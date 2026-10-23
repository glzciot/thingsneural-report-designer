import type { BorderSideStyle, CellModel, CellStyleModel, ReportState } from '@/model/types'
import { cellName, createCell, defaultStyle } from '@/model/types'

interface UColor {
  rgb?: string | null
}

interface UStyle {
  ff?: string | null
  fs?: number
  bl?: number
  it?: number
  ul?: { s?: number }
  bg?: UColor | null
  cl?: UColor | null
  bd?: Record<string, any> | null
  ht?: number
  vt?: number
  tb?: number
  n?: { pattern?: string } | null
}

interface UCell {
  v?: any
  t?: number
  s?: string | UStyle | null
  custom?: any
}

interface UMerge {
  startRow: number
  startColumn: number
  endRow: number
  endColumn: number
}

function toRgb(value: string): string {
  if (!value) return '#000000'
  const parts = value.split(',').map((v) => v.trim())
  if (parts.length === 3 && parts.every((p) => p !== '' && !Number.isNaN(Number(p)))) {
    return `rgb(${parts[0]},${parts[1]},${parts[2]})`
  }
  return value
}

function fromRgb(value?: string | null): string {
  if (!value) return ''
  const v = value.trim()
  if (v.startsWith('#')) {
    const hex = v.slice(1)
    if (hex.length === 6) {
      const n = parseInt(hex, 16)
      return `${(n >> 16) & 255},${(n >> 8) & 255},${n & 255}`
    }
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16)
      const g = parseInt(hex[1] + hex[1], 16)
      const b = parseInt(hex[2] + hex[2], 16)
      return `${r},${g},${b}`
    }
  }
  const m = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i)
  if (m) return `${m[1]},${m[2]},${m[3]}`
  return ''
}

function univerBorderStyle(border: BorderSideStyle): number {
  if (border.style === 'dashed') return border.size >= 3 ? 9 : 4
  if (border.size >= 4) return 13
  if (border.size >= 2) return 8
  return 1
}

function fromUniverBorder(
  node: any,
  base: BorderSideStyle | undefined,
): BorderSideStyle {
  const baseSide = base || { style: 'solid', size: 1, color: '0,0,0' }
  if (!node || node.s === 0 || node.s === null || node.s === undefined) {
    return { ...baseSide, style: 'none', size: 0 }
  }
  const dashed = node.s === 3 || node.s === 4 || node.s === 9 || node.s === 10 || node.s === 11
  const size =
    baseSide.style !== 'none' && baseSide.size > 0
      ? baseSide.size
      : node.s === 1
        ? 1
        : node.s === 8
          ? 2
          : 3
  return {
    style: dashed ? 'dashed' : 'solid',
    size,
    color: fromRgb(node.cl?.rgb) || baseSide.color || '0,0,0',
  }
}

function toUniverStyle(s: CellStyleModel): UStyle {
  const style: UStyle = {
    ff: s.fontFamily,
    fs: s.fontSize,
    bl: s.bold ? 1 : 0,
    it: s.italic ? 1 : 0,
    ht: s.align === 'center' ? 2 : s.align === 'right' ? 3 : 1,
    vt: s.valign === 'top' ? 1 : s.valign === 'bottom' ? 3 : 2,
    tb: s.wrapCompute ? 3 : 1,
    cl: { rgb: toRgb(s.forecolor || '0,0,0') },
  }
  if (s.underline) style.ul = { s: 1 }
  if (s.bgcolor) style.bg = { rgb: toRgb(s.bgcolor) }
  if (s.format) style.n = { pattern: s.format }
  const bd: Record<string, any> = {}
  const sides: Array<[string, keyof CellStyleModel['borders']]> = [
    ['t', 'top'],
    ['r', 'right'],
    ['b', 'bottom'],
    ['l', 'left'],
  ]
  for (const [key, side] of sides) {
    const border = s.borders?.[side]
    if (!border || border.style === 'none' || border.size <= 0) continue
    bd[key] = { s: univerBorderStyle(border), cl: { rgb: toRgb(border.color) } }
  }
  if (Object.keys(bd).length) style.bd = bd
  return style
}

function fromUniverStyle(s: UStyle | null | undefined, base: CellStyleModel): CellStyleModel {
  const style: CellStyleModel = { ...defaultStyle(), ...base }
  if (!s) return style
  if (s.ff) style.fontFamily = s.ff
  if (typeof s.fs === 'number') style.fontSize = s.fs
  style.bold = s.bl === 1
  style.italic = s.it === 1
  style.underline = s.ul?.s === 1
  if (s.ht === 1) style.align = 'left'
  else if (s.ht === 2) style.align = 'center'
  else if (s.ht === 3) style.align = 'right'
  if (s.vt === 1) style.valign = 'top'
  else if (s.vt === 2) style.valign = 'middle'
  else if (s.vt === 3) style.valign = 'bottom'
  if (s.cl?.rgb) style.forecolor = fromRgb(s.cl.rgb) || style.forecolor
  style.bgcolor = s.bg?.rgb ? fromRgb(s.bg.rgb) : ''
  style.format = s.n?.pattern || ''
  style.wrapCompute = s.tb === 3
  const bd: any = s.bd || {}
  style.borders = {
    top: fromUniverBorder(bd.t, base.borders?.top),
    right: fromUniverBorder(bd.r, base.borders?.right),
    bottom: fromUniverBorder(bd.b, base.borders?.bottom),
    left: fromUniverBorder(bd.l, base.borders?.left),
  }
  return style
}

function datasetDisplay(c: CellModel): string {
  return `{${c.datasetName}.${c.aggregate}(${c.property})}`
}

export function cellToUniverData(c: CellModel): UCell {
  const style = toUniverStyle(c.style)
  if (c.valueType === 'image') {
    return {
      v: `[图片] ${c.imageValue || ''}`.trim(),
      t: 1,
      s: style,
      custom: { report: { type: 'image' } },
    }
  }
  if (c.valueType === 'qrcode' || c.valueType === 'barcode') {
    return {
      v: `${c.valueType === 'qrcode' ? '[二维码]' : '[条码]'} ${c.zxingValue || ''}`.trim(),
      t: 1,
      s: style,
      custom: { report: { type: c.valueType } },
    }
  }
  if (c.valueType === 'diagonal') {
    const names = (c.slashItems || [])
      .map((item) => item.text)
      .filter(Boolean)
      .join(' / ')
    return {
      v: names ? `[斜表头] ${names}` : '[斜表头]',
      t: 1,
      s: style,
      custom: { report: { type: 'diagonal' } },
    }
  }
  if (c.valueType === 'chart') {
    return {
      v: `[图表] ${c.chartType || ''}`.trim(),
      t: 1,
      s: style,
      custom: { report: { type: 'chart' } },
    }
  }
  if (c.valueType === 'expression') {
    const expression = c.expression || ''
    return {
      v: expression,
      t: 1,
      s: style,
      custom: { report: { type: 'expression', expression } },
    }
  }
  if (c.valueType === 'dataset') {
    return {
      v: datasetDisplay(c),
      t: 1,
      s: style,
      custom: {
        report: {
          type: 'dataset',
          datasetName: c.datasetName,
          aggregate: c.aggregate,
          property: c.property,
          order: c.order,
        },
      },
    }
  }
  return { v: c.text || '', t: 1, s: style }
}

export function toWorkbook(model: ReportState): any {
  const styles: Record<string, UStyle> = {}
  const styleIds = new Map<string, string>()

  function styleId(style: CellStyleModel): string {
    const key = JSON.stringify(style)
    const cached = styleIds.get(key)
    if (cached) return cached
    const id = `s${styleIds.size}`
    styleIds.set(key, id)
    styles[id] = toUniverStyle(style)
    return id
  }

  const mergeData: UMerge[] = []
  const covered = new Set<string>()
  Object.values(model.cells).forEach((c) => {
    const rs = Math.max(c.rowSpan || 1, 1)
    const cs = Math.max(c.colSpan || 1, 1)
    if (rs > 1 || cs > 1) {
      mergeData.push({
        startRow: c.row - 1,
        startColumn: c.col - 1,
        endRow: c.row - 2 + rs,
        endColumn: c.col - 2 + cs,
      })
      for (let r = c.row; r < c.row + rs; r++) {
        for (let col = c.col; col < c.col + cs; col++) {
          if (r !== c.row || col !== c.col) covered.add(cellName(r, col))
        }
      }
    }
  })

  const cellData: Record<number, Record<number, UCell>> = {}
  Object.values(model.cells).forEach((c) => {
    if (covered.has(c.name)) return
    const row = c.row - 1
    const col = c.col - 1
    if (!cellData[row]) cellData[row] = {}
    cellData[row][col] = { ...cellToUniverData(c), s: styleId(c.style) }
  })

  const rowData: Record<number, { h: number }> = {}
  const columnData: Record<number, { w: number }> = {}
  for (let i = 0; i < model.rows; i++) rowData[i] = { h: Math.max(model.rowHeights[i] ?? 24, 22) }
  for (let i = 0; i < model.cols; i++) columnData[i] = { w: model.colWidths[i] ?? 90 }

  const sheetId = 'report-sheet'
  const sheet = {
    id: sheetId,
    name: 'Sheet1',
    rowCount: Math.max(model.rows, 12),
    columnCount: Math.max(model.cols, 8),
    defaultRowHeight: 24,
    defaultColumnWidth: 90,
    cellData,
    mergeData,
    rowData,
    columnData,
  }

  return {
    id: 'report-workbook',
    name: model.title || 'report',
    appVersion: '1.1.0',
    locale: 'zhCN',
    styles,
    sheetOrder: [sheetId],
    sheets: { [sheetId]: sheet },
  }
}

function stableCells(cells: Record<string, CellModel>): string {
  return Object.keys(cells)
    .sort()
    .map((key) => `${key}:${JSON.stringify(cells[key])}`)
    .join('|')
}

export function sameModel(a: ReportState, b: ReportState): boolean {
  return (
    a.rows === b.rows &&
    a.cols === b.cols &&
    JSON.stringify(a.rowHeights) === JSON.stringify(b.rowHeights) &&
    JSON.stringify(a.colWidths) === JSON.stringify(b.colWidths) &&
    stableCells(a.cells) === stableCells(b.cells)
  )
}

export function fromWorkbook(snapshot: any, base: ReportState): ReportState {
  const sheetId = snapshot?.sheetOrder?.[0] || Object.keys(snapshot?.sheets || {})[0]
  const sheet = snapshot?.sheets?.[sheetId]
  if (!sheet) return base

  const rowCount = Math.max(sheet.rowCount || 0, base.rows, 1)
  const colCount = Math.max(sheet.columnCount || 0, base.cols, 1)
  const merges: UMerge[] = sheet.mergeData || []
  const styles: Record<string, UStyle> = snapshot.styles || {}

  const mergeMap = new Map<string, UMerge>()
  const covered = new Set<string>()
  merges.forEach((m) => {
    mergeMap.set(cellName(m.startRow + 1, m.startColumn + 1), m)
    for (let r = m.startRow; r <= m.endRow; r++) {
      for (let c = m.startColumn; c <= m.endColumn; c++) {
        if (r !== m.startRow || c !== m.startColumn) covered.add(cellName(r + 1, c + 1))
      }
    }
  })

  const cells: Record<string, CellModel> = {}
  for (let r = 0; r < rowCount; r++) {
    for (let c = 0; c < colCount; c++) {
      const name = cellName(r + 1, c + 1)
      if (covered.has(name)) continue
      const data: UCell | undefined = sheet.cellData?.[r]?.[c]
      const merge = mergeMap.get(name)
      if (!data && !merge) continue

      const cell = createCell(name, r + 1, c + 1)
      const existing = base.cells[name]
      if (existing) {
        cell.leftParent = existing.leftParent
        cell.topParent = existing.topParent
        cell.expand = existing.expand
        cell.fillBlankRows = existing.fillBlankRows
        cell.multiple = existing.multiple
        cell.linkUrl = existing.linkUrl
        cell.linkTargetWindow = existing.linkTargetWindow
        cell.linkParameters = existing.linkParameters.map((p) => ({ ...p }))
        cell.conditionProperties = JSON.parse(JSON.stringify(existing.conditionProperties || []))
        cell.imageSource = existing.imageSource
        cell.imageValue = existing.imageValue
        cell.imageWidth = existing.imageWidth
        cell.imageHeight = existing.imageHeight
        cell.zxingSource = existing.zxingSource
        cell.zxingValue = existing.zxingValue
        cell.zxingWidth = existing.zxingWidth
        cell.zxingHeight = existing.zxingHeight
        cell.zxingFormat = existing.zxingFormat
        cell.zxingCodeDisplay = existing.zxingCodeDisplay
        cell.slashItems = existing.slashItems.map((item) => ({ ...item }))
        cell.chartType = existing.chartType
        cell.chartDatasetName = existing.chartDatasetName
        cell.chartCategoryProperty = existing.chartCategoryProperty
        cell.chartSeriesProperty = existing.chartSeriesProperty
        cell.chartValueProperty = existing.chartValueProperty
        cell.chartCollectType = existing.chartCollectType
      }
      if (data) {
        const report = data.custom?.report
        const text = data.v == null ? '' : String(data.v)
        if (report?.type === 'expression' && text === String(report.expression ?? '')) {
          cell.valueType = 'expression'
          cell.expression = report.expression ?? text
        } else if (
          report?.type === 'dataset' &&
          text === `{${report.datasetName}.${report.aggregate || 'group'}(${report.property})}`
        ) {
          cell.valueType = 'dataset'
          cell.datasetName = report.datasetName || ''
          cell.aggregate = report.aggregate || 'group'
          cell.property = report.property || ''
          cell.order = report.order || 'none'
        } else {
          cell.valueType = 'simple'
          cell.text = text
        }
        const style = typeof data.s === 'string' ? styles[data.s] : data.s
        const styleBase = {
          ...cell.style,
          borders: existing?.style.borders || cell.style.borders,
        }
        cell.style = fromUniverStyle(style as UStyle, styleBase)
      }
      if (existing) {
        cell.style.lineHeight = existing.style.lineHeight
      }
      if (
        existing &&
        ['image', 'diagonal', 'qrcode', 'barcode', 'chart'].includes(existing.valueType)
      ) {
        cell.valueType = existing.valueType
      }
      if (merge) {
        cell.rowSpan = merge.endRow - merge.startRow + 1
        cell.colSpan = merge.endColumn - merge.startColumn + 1
      }
      cells[name] = cell
    }
  }

  const rowHeights: number[] = []
  for (let i = 0; i < rowCount; i++) {
    rowHeights.push(Math.round(sheet.rowData?.[i]?.h ?? sheet.defaultRowHeight ?? 24))
  }
  const colWidths: number[] = []
  for (let i = 0; i < colCount; i++) {
    colWidths.push(Math.round(sheet.columnData?.[i]?.w ?? sheet.defaultColumnWidth ?? 90))
  }

  return {
    ...base,
    rows: rowCount,
    cols: colCount,
    rowHeights,
    colWidths,
    cells,
  }
}
