import { createUniver, LocaleType, mergeLocales } from '@univerjs/presets'
import { UniverSheetsCorePreset } from '@univerjs/preset-sheets-core'
import UniverPresetSheetsCoreZhCN from '@univerjs/preset-sheets-core/locales/zh-CN'
import '@univerjs/preset-sheets-core/lib/index.css'
import {
  cellName,
  type BorderSideStyle,
  type CellBorders,
  type CellModel,
  type CellStyleModel,
  type ReportState,
} from '@/model/types'
import { cellToUniverData, fromWorkbook, sameModel, toWorkbook } from './convert'

const WORKBOOK_ID = 'report-workbook'

interface Hooks {
  getModel: () => ReportState
  onModel: (model: ReportState) => void
  onSelect: (name: string) => void
}

let univer: any = null
let api: any = null
let hooks: Hooks | null = null
let disposables: Array<{ dispose: () => void }> = []
let syncTimer: ReturnType<typeof setTimeout> | undefined
let applyingModel = false
let pendingCell: CellModel | null = null
let hoverCell: { row: number; column: number } | null = null
const signatures = new Map<string, string>()

function toRgb(value?: string): string {
  if (!value) return '#ffffff'
  const parts = value.split(',').map((v) => v.trim())
  if (parts.length === 3 && parts.every((p) => p !== '' && !Number.isNaN(Number(p)))) {
    return `rgb(${parts[0]},${parts[1]},${parts[2]})`
  }
  return value
}

function cellSignature(cell: CellModel): string {
  return JSON.stringify({
    name: cell.name,
    row: cell.row,
    col: cell.col,
    rowSpan: cell.rowSpan,
    colSpan: cell.colSpan,
    valueType: cell.valueType,
    text: cell.text,
    expression: cell.expression,
    datasetName: cell.datasetName,
    aggregate: cell.aggregate,
    property: cell.property,
    order: cell.order,
    imageSource: cell.imageSource,
    imageValue: cell.imageValue,
    zxingSource: cell.zxingSource,
    zxingValue: cell.zxingValue,
    zxingFormat: cell.zxingFormat,
    zxingCodeDisplay: cell.zxingCodeDisplay,
    slashItems: cell.slashItems,
    chartType: cell.chartType,
    chartDatasetName: cell.chartDatasetName,
    chartCategoryProperty: cell.chartCategoryProperty,
    chartSeriesProperty: cell.chartSeriesProperty,
    chartValueProperty: cell.chartValueProperty,
    chartCollectType: cell.chartCollectType,
    style: { ...cell.style, lineHeight: 0 },
  })
}

function resetSignatures(model: ReportState) {
  signatures.clear()
  Object.values(model.cells).forEach((cell) => signatures.set(cell.name, cellSignature(cell)))
}

function activeRange(): any {
  return api?.getActiveWorkbook()?.getActiveSheet()?.getActiveRange?.() || null
}

function getSheet(): any {
  return api?.getActiveWorkbook()?.getActiveSheet?.() || null
}

function updateHover(params: any) {
  if (typeof params?.row === 'number' && typeof params?.column === 'number') {
    hoverCell = { row: params.row, column: params.column }
  }
}

function scheduleSync(delay = 150) {
  if (!api) return
  if (syncTimer) clearTimeout(syncTimer)
  syncTimer = setTimeout(() => {
    syncTimer = undefined
    if (!applyingModel) syncNow()
  }, delay)
}

function syncNow() {
  if (!api || !hooks) return
  const workbook = api.getActiveWorkbook()
  if (!workbook) return
  const snapshot = workbook.save()
  const current = hooks.getModel()
  const next = fromWorkbook(snapshot, current)
  if (sameModel(next, current)) return
  resetSignatures(next)
  hooks.onModel(next)
}

function applyCell(cell: CellModel) {
  if (!api) return
  const sig = cellSignature(cell)
  if (signatures.get(cell.name) === sig) return
  if (applyingModel) {
    pendingCell = cell
    return
  }

  const sheet = api.getActiveWorkbook()?.getActiveSheet()
  if (!sheet) return
  const range = sheet.getRange(cell.row - 1, cell.col - 1)
  if (!range) return

  applyingModel = true
  try {
    range.setValueForCell(cellToUniverData(cell))

    const rs = Math.max(cell.rowSpan || 1, 1)
    const cs = Math.max(cell.colSpan || 1, 1)
    if (rs > 1 || cs > 1) {
      const target = sheet.getRange(cell.row - 1, cell.col - 1, rs, cs)
      if (!target.isMerged()) {
        if (target.isPartOfMerge()) target.breakApart()
        target.merge()
      }
    } else if (range.isPartOfMerge()) {
      range.breakApart()
    }
    signatures.set(cell.name, sig)
  } finally {
    applyingModel = false
    if (pendingCell) {
      const next = pendingCell
      pendingCell = null
      applyCell(next)
    }
  }
}

function borderEnum(border: BorderSideStyle): number {
  if (border.style === 'dashed') return border.size >= 3 ? 9 : 4
  if (border.size >= 4) return 13
  if (border.size >= 2) return 8
  return 1
}

function applyStyleToSelection(patch: Partial<CellStyleModel>) {
  if (!api) return
  const range = activeRange()
  if (!range) return
  applyingModel = true
  try {
    if (patch.fontFamily !== undefined) range.setFontFamily(patch.fontFamily)
    if (patch.fontSize !== undefined) range.setFontSize(patch.fontSize)
    if (patch.bold !== undefined) range.setFontWeight(patch.bold ? 'bold' : 'normal')
    if (patch.italic !== undefined) range.setFontStyle(patch.italic ? 'italic' : 'normal')
    if (patch.underline !== undefined) range.setFontLine(patch.underline ? 'underline' : 'none')
    if (patch.align !== undefined) {
      range.setHorizontalAlignment(
        patch.align === 'center' ? 'center' : patch.align === 'right' ? 'normal' : 'left',
      )
    }
    if (patch.valign !== undefined) range.setVerticalAlignment(patch.valign)
    if (patch.forecolor !== undefined) range.setFontColor(toRgb(patch.forecolor))
    if (patch.bgcolor !== undefined) {
      if (patch.bgcolor) range.setBackgroundColor(toRgb(patch.bgcolor))
      else range.setBackgroundColor(null as any)
    }
    if (patch.wrapCompute !== undefined) range.setWrap(!!patch.wrapCompute)
    if (patch.format !== undefined && patch.format) range.setNumberFormat(patch.format)
  } finally {
    applyingModel = false
    scheduleSync(100)
  }
}

export const univerBridge = {
  isReady(): boolean {
    return !!api
  },

  mount(container: HTMLElement, model: ReportState, nextHooks: Hooks) {
    hooks = nextHooks
    if (api) {
      this.reload(model)
      return
    }

    const result = createUniver({
      locale: LocaleType.ZH_CN,
      locales: {
        [LocaleType.ZH_CN]: mergeLocales(UniverPresetSheetsCoreZhCN as any),
      },
      presets: [
        UniverSheetsCorePreset({
          container,
          header: false,
          toolbar: false,
          formulaBar: false,
          footer: false,
          contextMenu: false,
        }),
      ],
    })
    univer = result.univer
    api = result.univerAPI

    if (import.meta.env.DEV) {
      ;(globalThis as any).__univer = { api, bridge: univerBridge }
    }

    api.createWorkbook(toWorkbook(model))
    resetSignatures(model)

    const handleSelection = (params: any) => {
      const active = params?.worksheet?.getActiveCell?.()
      const a1 = active?.getA1Notation?.() || ''
      const name = a1.replace(/\$/g, '').split(':')[0]
      if (name) hooks?.onSelect(name)
    }

    disposables = [
      api.addEvent(api.Event.CommandExecuted, () => scheduleSync()),
      api.addEvent(api.Event.SelectionChanged, handleSelection),
      api.addEvent(api.Event.SelectionMoveEnd, handleSelection),
      api.addEvent(api.Event.CellClicked, (params: any) => {
        if (typeof params?.row === 'number' && typeof params?.column === 'number') {
          hooks?.onSelect(cellName(params.row + 1, params.column + 1))
        }
      }),
      api.addEvent(api.Event.CellPointerMove, updateHover),
      api.addEvent(api.Event.CellHover, updateHover),
    ]
  },

  reload(model: ReportState) {
    if (!api) return
    applyingModel = true
    try {
      try {
        api.disposeUnit(WORKBOOK_ID)
      } catch {
        /* ignore */
      }
      api.createWorkbook(toWorkbook(model))
      resetSignatures(model)
    } finally {
      applyingModel = false
    }
  },

  async flushSync() {
    if (!api || !hooks) return
    const workbook = api.getActiveWorkbook()
    if (workbook?.endEditingAsync) {
      try {
        await workbook.endEditingAsync(true)
      } catch {
        /* ignore */
      }
    }
    syncNow()
  },

  activateCell(name: string) {
    if (!api) return
    const match = /^([A-Z]+)(\d+)$/.exec(name || '')
    if (!match) return
    let col = 0
    for (const ch of match[1]) col = col * 26 + (ch.charCodeAt(0) - 64)
    const sheet = api.getActiveWorkbook()?.getActiveSheet?.()
    sheet?.getRange?.(Number(match[2]) - 1, col - 1)?.activate?.()
  },

  syncSelection() {
    if (!api || !hooks) return
    const active = api.getActiveWorkbook()?.getActiveCell?.()
    const a1 = active?.getA1Notation?.() || ''
    const name = a1.replace(/\$/g, '').split(':')[0]
    if (name) hooks.onSelect(name)
  },

  getHoverCell() {
    return hoverCell ? { ...hoverCell } : null
  },

  getActiveCellPosition() {
    if (!api) return null
    const sheet = getSheet()
    const active = sheet?.getActiveCell?.()
    const raw = active?.getRange?.()
    if (raw) return { row: raw.startRow, column: raw.startColumn }
    const a1 = active?.getA1Notation?.() || ''
    const match = /^([A-Z]+)(\d+)$/.exec(a1.replace(/\$/g, ''))
    if (!match) return null
    let col = 0
    for (const ch of match[1]) col = col * 26 + (ch.charCodeAt(0) - 64)
    return { row: Number(match[2]) - 1, column: col - 1 }
  },

  insertRowBefore(row: number, count = 1) {
    if (row < 1) return
    getSheet()?.insertRowsBefore?.(row - 1, Math.max(count, 1))
  },

  insertRowAfter(row: number, count = 1) {
    if (row < 1) return
    getSheet()?.insertRowsAfter?.(row - 1, Math.max(count, 1))
  },

  insertColumnBefore(col: number, count = 1) {
    if (col < 1) return
    getSheet()?.insertColumnsBefore?.(col - 1, Math.max(count, 1))
  },

  insertColumnAfter(col: number, count = 1) {
    if (col < 1) return
    getSheet()?.insertColumnsAfter?.(col - 1, Math.max(count, 1))
  },

  deleteRow(row: number) {
    if (row < 1) return
    getSheet()?.deleteRow?.(row - 1)
  },

  deleteColumn(col: number) {
    if (col < 1) return
    getSheet()?.deleteColumn?.(col - 1)
  },

  setRowHeight(row: number, height: number) {
    if (row < 1 || height <= 0) return
    getSheet()?.setRowHeight?.(row - 1, height)
  },

  setColumnWidth(col: number, width: number) {
    if (col < 1 || width <= 0) return
    getSheet()?.setColumnWidth?.(col - 1, width)
  },

  clearContent(row: number, col: number) {
    getSheet()?.getRange?.(row - 1, col - 1)?.clearContent?.()
  },

  clearFormat(row: number, col: number) {
    getSheet()?.getRange?.(row - 1, col - 1)?.clearFormat?.()
  },

  clearAll(row: number, col: number) {
    const range = getSheet()?.getRange?.(row - 1, col - 1)
    if (!range) return
    if (range.isPartOfMerge?.()) range.breakApart()
    range.clear?.()
  },

  clearCell(cell: CellModel) {
    if (!api) {
      signatures.delete(cell.name)
      return
    }
    const sheet = api.getActiveWorkbook()?.getActiveSheet()
    if (!sheet) return
    const range = sheet.getRange(cell.row - 1, cell.col - 1)
    applyingModel = true
    try {
      if (range) {
        if (range.isPartOfMerge?.()) range.breakApart()
        range.clear?.()
      }
      signatures.delete(cell.name)
    } finally {
      applyingModel = false
      scheduleSync(100)
    }
  },

  async undo() {
    if (!api) return false
    const result = await api.undo()
    syncNow()
    return result
  },

  async redo() {
    if (!api) return false
    const result = await api.redo()
    syncNow()
    return result
  },

  syncNow,
  applyCell,
  markCell(cell: CellModel) {
    signatures.set(cell.name, cellSignature(cell))
  },
  applyStyleToSelection,

  toggleMergeSelection() {
    const sheet = getSheet()
    const range = activeRange()
    if (!sheet || !range) return
    const raw = range.getRange?.()
    if (!raw) return
    const merged = (sheet.getMergedRanges?.() || []).find((item: any) => {
      const m = item.getRange?.()
      if (!m) return false
      return (
        raw.startRow <= m.endRow &&
        raw.endRow >= m.startRow &&
        raw.startColumn <= m.endColumn &&
        raw.endColumn >= m.startColumn
      )
    })
    applyingModel = true
    try {
      if (merged) {
        merged.breakApart()
      } else if (raw.startRow !== raw.endRow || raw.startColumn !== raw.endColumn) {
        range.merge()
      }
    } finally {
      applyingModel = false
      scheduleSync(100)
    }
  },

  applyBorderPreset(kind: 'all' | 'none' | 'left' | 'right' | 'top' | 'bottom') {
    const range = activeRange()
    if (!range) return
    applyingModel = true
    try {
      if (kind === 'none') {
        range.setBorder('none', 0, '#000000')
      } else if (kind === 'all') {
        range.setBorder('all', 1, '#000000')
      } else {
        range.setBorder(kind, 1, '#000000')
      }
    } finally {
      applyingModel = false
      scheduleSync(100)
    }
  },

  applyBorders(borders: CellBorders) {
    const range = activeRange()
    if (!range) return
    applyingModel = true
    try {
      const sides: Array<[string, keyof CellBorders]> = [
        ['top', 'top'],
        ['right', 'right'],
        ['bottom', 'bottom'],
        ['left', 'left'],
      ]
      for (const [side, key] of sides) {
        const border = borders[key]
        if (!border || border.style === 'none' || border.size <= 0) {
          range.setBorder(side, 0, toRgb(border?.color || '0,0,0'))
        } else {
          range.setBorder(side, borderEnum(border), toRgb(border.color))
        }
      }
    } finally {
      applyingModel = false
      scheduleSync(100)
    }
  },

  freezeRows(count: number) {
    getSheet()?.setFrozenRows?.(Math.max(0, Math.round(count)))
  },

  freezeColumns(count: number) {
    getSheet()?.setFrozenColumns?.(Math.max(0, Math.round(count)))
  },

  freezePane(row: number, column: number) {
    const sheet = getSheet()
    sheet?.setFrozenRows?.(Math.max(0, Math.round(row)))
    sheet?.setFrozenColumns?.(Math.max(0, Math.round(column)))
  },

  getFreezeState() {
    const sheet = getSheet()
    return {
      rows: Number(sheet?.getFrozenRows?.() || 0),
      columns: Number(sheet?.getFrozenColumns?.() || 0),
    }
  },

  unfreeze() {
    const sheet = getSheet()
    sheet?.setFrozenRows?.(0)
    sheet?.setFrozenColumns?.(0)
  },

  mergeSelection() {
    const range = activeRange()
    if (!range) return
    const raw = range.getRange?.()
    if (raw && raw.startRow === raw.endRow && raw.startColumn === raw.endColumn) return
    applyingModel = true
    try {
      range.merge()
    } finally {
      applyingModel = false
      scheduleSync(100)
    }
  },

  breakApartSelection() {
    const range = activeRange()
    if (!range) return
    applyingModel = true
    try {
      range.breakApart()
    } catch {
      /* ignore */
    } finally {
      applyingModel = false
      scheduleSync(100)
    }
  },

  destroy() {
    disposables.forEach((d) => d.dispose())
    disposables = []
    if (syncTimer) clearTimeout(syncTimer)
    pendingCell = null
    hoverCell = null
    signatures.clear()
    univer?.dispose()
    univer = null
    api = null
    hooks = null
  },
}
