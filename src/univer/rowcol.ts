import { cellName, type CellModel, type ReportState, type RowBand } from '@/model/types'

export interface DesignCell {
  leftParent: string
  topParent: string
  expand: CellModel['expand']
  fillBlankRows: boolean
  multiple: number
  linkUrl: string
  linkTargetWindow: string
}

export interface DesignSnapshot {
  cells: Record<string, DesignCell>
  bands: Record<number, RowBand>
}

export type LayoutOp =
  | { kind: 'insertRow'; index: number; where: 'before' | 'after'; count: number }
  | { kind: 'deleteRow'; index: number }
  | { kind: 'insertColumn'; index: number; where: 'before' | 'after'; count: number }
  | { kind: 'deleteColumn'; index: number }

function colToNum(col: string): number {
  let n = 0
  for (const ch of col) n = n * 26 + (ch.charCodeAt(0) - 64)
  return n
}

function parseName(name: string): { row: number; col: number } | null {
  const match = /^([A-Z]+)(\d+)$/.exec(name || '')
  if (!match) return null
  return { row: Number(match[2]), col: colToNum(match[1]) }
}

export function captureDesign(model: ReportState): DesignSnapshot {
  const cells: Record<string, DesignCell> = {}
  Object.values(model.cells).forEach((cell) => {
    cells[cell.name] = {
      leftParent: cell.leftParent,
      topParent: cell.topParent,
      expand: cell.expand,
      fillBlankRows: cell.fillBlankRows,
      multiple: cell.multiple,
      linkUrl: cell.linkUrl,
      linkTargetWindow: cell.linkTargetWindow,
    }
  })
  return { cells, bands: { ...model.rowBands } }
}

function mapRow(row: number, op: LayoutOp): number | null {
  if (op.kind === 'insertRow') {
    const count = Math.max(op.count || 1, 1)
    if (op.where === 'before') return row >= op.index ? row + count : row
    return row > op.index ? row + count : row
  }
  if (op.kind === 'deleteRow') {
    if (row === op.index) return null
    return row > op.index ? row - 1 : row
  }
  return row
}

function mapCol(col: number, op: LayoutOp): number | null {
  if (op.kind === 'insertColumn') {
    const count = Math.max(op.count || 1, 1)
    if (op.where === 'before') return col >= op.index ? col + count : col
    return col > op.index ? col + count : col
  }
  if (op.kind === 'deleteColumn') {
    if (col === op.index) return null
    return col > op.index ? col - 1 : col
  }
  return col
}

function mapRef(ref: string, op: LayoutOp): string {
  if (!ref || ref === 'root') return ref
  const pos = parseName(ref)
  if (!pos) return ref
  const row = mapRow(pos.row, op)
  const col = mapCol(pos.col, op)
  if (row == null || col == null) return 'root'
  return cellName(row, col)
}

export function applyDesignAfterOp(model: ReportState, snapshot: DesignSnapshot, op: LayoutOp) {
  Object.entries(snapshot.cells).forEach(([name, design]) => {
    const pos = parseName(name)
    if (!pos) return
    const row = mapRow(pos.row, op)
    const col = mapCol(pos.col, op)
    if (row == null || col == null) return
    const cell = model.cells[cellName(row, col)]
    if (!cell) return
    cell.leftParent = mapRef(design.leftParent, op)
    cell.topParent = mapRef(design.topParent, op)
    cell.expand = design.expand
    cell.fillBlankRows = design.fillBlankRows
    cell.multiple = design.multiple
    cell.linkUrl = design.linkUrl
    cell.linkTargetWindow = design.linkTargetWindow
  })

  const bands: Record<number, RowBand> = {}
  Object.entries(snapshot.bands).forEach(([row, band]) => {
    const mapped = mapRow(Number(row), op)
    if (mapped != null) bands[mapped] = band
  })
  model.rowBands = bands
}
