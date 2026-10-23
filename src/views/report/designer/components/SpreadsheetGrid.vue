<script setup lang="ts">
import { computed } from 'vue'
import { useDesignerStore } from '@/stores'
import { cellName, colName, type CellModel } from '@/model/types'
import { toCssColor } from '@/utils'

const store = useDesignerStore()

const covered = computed(() => {
  const set = new Set<string>()
  Object.values(store.model.cells).forEach((c) => {
    const rs = Math.max(c.rowSpan || 1, 1)
    const cs = Math.max(c.colSpan || 1, 1)
    for (let r = c.row; r < c.row + rs; r++) {
      for (let col = c.col; col < c.col + cs; col++) {
        if (r !== c.row || col !== c.col) set.add(`${r},${col}`)
      }
    }
  })
  return set
})

function isCovered(r: number, c: number) {
  return covered.value.has(`${r},${c}`)
}

function cell(r: number, c: number): CellModel | undefined {
  return store.model.cells[cellName(r, c)]
}

function display(c?: CellModel): string {
  if (!c) return ''
  if (c.valueType === 'dataset') return `{${c.datasetName}.${c.aggregate}(${c.property})}`
  if (c.valueType === 'expression') return `=${c.expression}`
  return c.text || ''
}

function isEditable(c?: CellModel) {
  return !c || c.valueType === 'simple'
}

function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

function highlightExpr(expr: string): string {
  let html = escapeHtml(expr || '')
  html = html.replace(/\b(var|let|return|if|else|function)\b/g, '<span class="kw">$1</span>')
  html = html.replace(/\b([A-Z]{1,3}\d+)\b/g, '<span class="ref">$1</span>')
  return html
}

function onEdit(r: number, c: number, e: Event) {
  const name = cellName(r, c)
  const target = store.ensureCell(name, r, c)
  target.text = (e.target as HTMLElement).innerText
  target.valueType = 'simple'
}

function tdStyle(c?: CellModel) {
  if (!c) return {}
  const s = c.style
  return {
    fontSize: `${s.fontSize}pt`,
    fontFamily: s.fontFamily,
    fontWeight: s.bold ? 'bold' : 'normal',
    fontStyle: s.italic ? 'italic' : 'normal',
    textDecoration: s.underline ? 'underline' : 'none',
    textAlign: s.align,
    verticalAlign: s.valign,
    color: toCssColor(s.forecolor),
    background: s.bgcolor ? toCssColor(s.bgcolor) : '',
    border: Object.values(s.borders || {}).some((b: any) => b?.style !== 'none' && b?.size > 0)
      ? '1px solid #c9cdd4'
      : '',
  }
}
</script>

<template>
  <div class="grid-wrap">
    <table class="grid">
      <thead>
        <tr>
          <th class="corner"></th>
          <th
            v-for="c in store.model.cols"
            :key="c"
            :style="{ width: `${store.model.colWidths[c - 1] ?? 80}px` }"
          >
            {{ colName(c) }}
          </th>
          <th class="add" title="新增列" @click="store.addCol()">+</th>
        </tr>
      </thead>
      <tbody>
        <tr
          v-for="r in store.model.rows"
          :key="r"
          :style="{ height: `${store.model.rowHeights[r - 1] ?? 18}px` }"
        >
          <th class="rownum">{{ r }}</th>
          <template v-for="c in store.model.cols" :key="c">
            <td
              v-if="!isCovered(r, c)"
              class="cell"
              :class="[cell(r, c)?.valueType || 'simple', { selected: store.selected === cellName(r, c) }]"
              :rowspan="cell(r, c)?.rowSpan && cell(r, c)!.rowSpan > 1 ? cell(r, c)!.rowSpan : undefined"
              :colspan="cell(r, c)?.colSpan && cell(r, c)!.colSpan > 1 ? cell(r, c)!.colSpan : undefined"
              :style="tdStyle(cell(r, c))"
              :contenteditable="isEditable(cell(r, c))"
              @click="store.selectAt(r, c)"
              @blur="onEdit(r, c, $event)"
            >
              <span
                v-if="cell(r, c)?.valueType === 'expression'"
                class="expr-code"
                v-html="highlightExpr(cell(r, c)!.expression)"
              />
              <span v-else>{{ display(cell(r, c)) }}</span>
            </td>
          </template>
        </tr>
        <tr>
          <th class="add" title="新增行" @click="store.addRow()">+</th>
        </tr>
      </tbody>
    </table>
  </div>
</template>
