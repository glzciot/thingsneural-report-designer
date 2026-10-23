import { defineStore } from 'pinia'
import {
  cellName,
  createCell,
  emptyReport,
  parseCellName,
  type CellModel,
  type ReportState,
  type RowBand,
} from '@/model/types'
import { buildXml, parseXml } from '@/model/xml'
import { reportApi } from '@/api'
import { downloadBlob, getCurrentProjectId } from '@/utils'
import { univerBridge } from '@/univer/bridge'

export const useDesignerStore = defineStore('designer', {
  state: () => ({
    title: '新建报表',
    reportId: '',
    model: emptyReport() as ReportState,
    selected: 'A1',
    loading: false,
    previewOpen: false,
    previewHtml: '',
    previewStyle: '',
    previewPageIndex: 0,
    previewTotalPage: 0,
    modelVersion: 0,
    parentPick: null as 'left' | 'top' | null,
    activePanel: 'property' as 'property' | 'dataset',
  }),

  getters: {
    xml(state): string {
      return buildXml(state.model)
    },
    selectedCell(state): CellModel | null {
      return state.model.cells[state.selected] || null
    },
  },

  actions: {
    ensureProject(): string {
      const projectId = getCurrentProjectId()
      if (!projectId) {
        throw new Error('未获取到当前项目，请从平台选择项目后进入')
      }
      return projectId
    },

    select(name: string) {
      this.selected = name
    },

    beginParentPick(kind: 'left' | 'top') {
      this.parentPick = kind
    },

    cancelParentPick() {
      this.parentPick = null
    },

    setParent(kind: 'left' | 'top', name: string) {
      const pos = parseCellName(this.selected)
      if (pos) {
        const cell = this.ensureCell(this.selected, pos.row, pos.col)
        if (kind === 'left') cell.leftParent = name
        else cell.topParent = name
      }
      this.parentPick = null
    },

    applySheetModel(model: ReportState) {
      this.model.cells = model.cells
      this.model.rows = model.rows
      this.model.cols = model.cols
      this.model.rowHeights = model.rowHeights
      this.model.colWidths = model.colWidths
    },

    ensureCell(name: string, row: number, col: number): CellModel {
      if (!this.model.cells[name]) {
        this.model.cells[name] = createCell(name, row, col)
      }
      return this.model.cells[name]
    },

    selectAt(row: number, col: number) {
      const name = cellName(row, col)
      this.ensureCell(name, row, col)
      this.selected = name
    },

    updateCell(patch: Partial<CellModel>) {
      const cell = this.model.cells[this.selected]
      if (cell) Object.assign(cell, patch)
    },

    updateStyle(patch: Partial<CellModel['style']>) {
      const cell = this.model.cells[this.selected]
      if (cell) cell.style = { ...cell.style, ...patch }
    },

    removeSelected() {
      const cell = this.model.cells[this.selected]
      if (cell) univerBridge.clearCell(cell)
      delete this.model.cells[this.selected]
    },

    setTitle(value: string) {
      this.title = value
      this.model.title = value
    },

    setRowBand(row: number, band: RowBand) {
      this.model.rowBands[row] = band
    },

    clearRowBand(row: number) {
      delete this.model.rowBands[row]
    },

    addRow() {
      this.model.rows += 1
      this.model.rowHeights.push(18)
    },

    addCol() {
      this.model.cols += 1
      this.model.colWidths.push(80)
    },

    newReport() {
      this.reportId = ''
      this.title = '新建报表'
      this.model = emptyReport()
      this.selected = 'A1'
      this.ensureCell('A1', 1, 1)
      this.modelVersion += 1
    },

    async save(): Promise<string> {
      const projectId = this.ensureProject()
      this.loading = true
      try {
        await univerBridge.flushSync()
        const vo = await reportApi.save(projectId, {
          id: this.reportId || undefined,
          projectId,
          title: this.title,
          content: this.xml,
        })
        this.reportId = vo.id
        return vo.id
      } finally {
        this.loading = false
      }
    },

    async load(id: string) {
      const projectId = this.ensureProject()
      this.loading = true
      try {
        const vo = await reportApi.get(projectId, id)
        this.reportId = vo.id
        this.title = vo.title || '未命名报表'
        this.model = parseXml(vo.content || '')
        this.model.title = this.title
        this.selected = 'A1'
        this.ensureCell('A1', 1, 1)
        this.modelVersion += 1
      } finally {
        this.loading = false
      }
    },

    async render(pageIndex?: string) {
      const projectId = this.ensureProject()
      const id = this.reportId || (await this.save())
      this.loading = true
      try {
        await univerBridge.flushSync()
        const vo = await reportApi.render(projectId, id, { pageIndex })
        this.previewHtml = vo.content || ''
        this.previewStyle = vo.style || ''
        this.previewPageIndex = vo.pageIndex || 0
        this.previewTotalPage = vo.totalPage || 0
        this.previewOpen = true
      } finally {
        this.loading = false
      }
    },

    async exportPdf() {
      const projectId = this.ensureProject()
      const id = this.reportId || (await this.save())
      this.loading = true
      try {
        const blob = await reportApi.exportPdf(projectId, id)
        downloadBlob(blob, `${this.title || 'report'}.pdf`)
      } finally {
        this.loading = false
      }
    },

    async exportExcel() {
      const projectId = this.ensureProject()
      const id = this.reportId || (await this.save())
      this.loading = true
      try {
        const blob = await reportApi.exportExcel(projectId, id)
        downloadBlob(blob, `${this.title || 'report'}.xlsx`)
      } finally {
        this.loading = false
      }
    },
  },
})
