import type { CellModel, CellStyleModel, ReportState, RowBand } from './types'
import { noBorders } from './types'
import { cellName, createCell, defaultStyle, emptyReport } from './types'

function attr(v: any): string {
  return String(v ?? '')
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

function cdata(v: any): string {
  return String(v ?? '').replace(/]]>/g, ']]]]><![CDATA[>')
}

function num(v: string | null, def = 0): number {
  const n = Number(v)
  return Number.isFinite(n) ? n : def
}

function bool(v: string | null): boolean {
  return v === 'true'
}

function styleXml(s: CellStyleModel): string {
  const a: string[] = []
  a.push(`font-size="${s.fontSize}"`)
  a.push(`font-family="${attr(s.fontFamily)}"`)
  a.push(`align="${attr(s.align)}"`)
  a.push(`valign="${attr(s.valign)}"`)
  a.push(`forecolor="${attr(s.forecolor)}"`)
  if (s.bgcolor) a.push(`bgcolor="${attr(s.bgcolor)}"`)
  if (s.format) a.push(`format="${attr(s.format)}"`)
  if (s.lineHeight > 0) a.push(`line-height="${s.lineHeight}"`)
  if (s.bold) a.push('bold="true"')
  if (s.italic) a.push('italic="true"')
  if (s.underline) a.push('underline="true"')
  if (s.wrapCompute) a.push('wrap-compute="true"')
  const borderTags: Array<[string, keyof CellStyleModel['borders']]> = [
    ['left-border', 'left'],
    ['right-border', 'right'],
    ['top-border', 'top'],
    ['bottom-border', 'bottom'],
  ]
  const borders = borderTags
    .map(([tag, side]) => {
      const border = s.borders[side]
      if (!border || border.style === 'none' || border.size <= 0) return ''
      return `<${tag} width="${border.size}" style="${border.style}" color="${attr(border.color)}"/>`
    })
    .join('')
  return `<cell-style ${a.join(' ')}>${borders}</cell-style>`
}

function cellXml(c: CellModel): string {
  const a: string[] = []
  a.push(`name="${attr(c.name)}"`)
  a.push(`col="${c.col}"`)
  a.push(`row="${c.row}"`)
  if (c.leftParent) a.push(`left-cell="${attr(c.leftParent)}"`)
  if (c.topParent) a.push(`top-cell="${attr(c.topParent)}"`)
  if (c.rowSpan > 1) a.push(`row-span="${c.rowSpan}"`)
  if (c.colSpan > 1) a.push(`col-span="${c.colSpan}"`)
  a.push(`expand="${attr(c.expand)}"`)
  if (c.fillBlankRows) {
    a.push('fill-blank-rows="true"')
    if (c.multiple > 0) a.push(`multiple="${c.multiple}"`)
  }
  if (c.linkUrl) {
    a.push(`link-url="${attr(c.linkUrl)}"`)
    a.push(`link-target-window="${attr(c.linkTargetWindow || '_self')}"`)
  }

  const inner: string[] = []
  if (c.valueType === 'dataset') {
    inner.push(
      `<dataset-value dataset-name="${attr(c.datasetName)}" aggregate="${attr(c.aggregate)}" ` +
        `property="${attr(c.property)}" order="${attr(c.order || 'none')}"/>`,
    )
  } else if (c.valueType === 'expression') {
    inner.push(`<expression-value><![CDATA[${cdata(c.expression)}]]></expression-value>`)
  } else if (c.valueType === 'image') {
    const size =
      `${c.imageWidth > 0 ? ` width="${c.imageWidth}"` : ''}` +
      `${c.imageHeight > 0 ? ` height="${c.imageHeight}"` : ''}`
    inner.push(
      `<image-value source="${attr(c.imageSource || 'text')}"${size}>` +
        `<text><![CDATA[${cdata(c.imageValue)}]]></text></image-value>`,
    )
  } else if (c.valueType === 'qrcode' || c.valueType === 'barcode') {
    const format = c.zxingFormat ? ` format="${attr(c.zxingFormat)}"` : ''
    inner.push(
      `<zxing-value source="${attr(c.zxingSource || 'text')}" category="${c.valueType}"` +
        ` width="${c.zxingWidth || 0}" height="${c.zxingHeight || 0}"${format} ` +
        `code-display="${c.zxingCodeDisplay ? 'true' : 'false'}">` +
        `<text><![CDATA[${cdata(c.zxingValue)}]]></text></zxing-value>`,
    )
  } else if (c.valueType === 'diagonal') {
    const slashes = c.slashItems?.length
      ? c.slashItems
      : [{ text: '', x: 0, y: 0, degree: 0 }]
    inner.push(
      `<slash-value>` +
        slashes
          .map(
            (item) =>
              `<slash text="${attr(item.text)}" x="${item.x || 0}" y="${item.y || 0}" degree="${
                item.degree || 0
              }"/>`,
          )
          .join('') +
        `<base64-data><![CDATA[]]></base64-data></slash-value>`,
    )
  } else if (c.valueType === 'chart') {
    const datasetAttrs = [
      `type="${attr(c.chartType || 'bar')}"`,
      c.chartDatasetName ? `dataset-name="${attr(c.chartDatasetName)}"` : '',
      c.chartCategoryProperty ? `category-property="${attr(c.chartCategoryProperty)}"` : '',
      c.chartSeriesProperty ? `series-property="${attr(c.chartSeriesProperty)}"` : '',
      c.chartSeriesProperty ? 'series-type="property"' : '',
      c.chartValueProperty ? `value-property="${attr(c.chartValueProperty)}"` : '',
      c.chartCollectType ? `collect-type="${attr(c.chartCollectType)}"` : '',
    ]
      .filter(Boolean)
      .join(' ')
    inner.push(`<chart-value><dataset ${datasetAttrs}/></chart-value>`)
  } else {
    inner.push(`<simple-value><![CDATA[${cdata(c.text)}]]></simple-value>`)
  }
  inner.push(styleXml(c.style))

  for (const cp of c.conditionProperties || []) {
    const attrs = [`name="${attr(cp.name || 'condition')}"`, `type="${attr(cp.type || 'normal')}"`]
    if (cp.newValue) attrs.push(`new-value="${attr(cp.newValue)}"`)
    if (cp.linkUrl) {
      attrs.push(`link-url="${attr(cp.linkUrl)}"`)
      attrs.push(`link-target-window="${attr(cp.linkTargetWindow || '_blank')}"`)
    }
    const conditions = (cp.conditions || [])
      .map(
        (cond) =>
          `<condition property="${attr(cond.property)}" op="${attr(cond.op)}">` +
          `<value><![CDATA[${cdata(cond.value)}]]></value></condition>`,
      )
      .join('')
    inner.push(`<condition-property-item ${attrs.join(' ')}>${conditions}</condition-property-item>`)
  }

  for (const param of c.linkParameters || []) {
    if (!param.name) continue
    inner.push(
      `<link-parameter name="${attr(param.name)}">` +
        `<value><![CDATA[${cdata(param.value)}]]></value></link-parameter>`,
    )
  }

  return `<cell ${a.join(' ')}>${inner.join('')}</cell>`
}

export function buildXml(state: ReportState): string {
  const parts: string[] = []
  parts.push('<?xml version="1.0" encoding="UTF-8"?>')
  parts.push('<ureport>')

  const datasets = state.datasets.filter((d) => d.name && d.fields.some(Boolean))

  const cells = Object.values(state.cells).sort((a, b) => a.row - b.row || a.col - b.col)
  for (const c of cells) parts.push(cellXml(c))

  for (let r = 1; r <= state.rows; r++) {
    const band = state.rowBands[r]
    parts.push(
      `<row row-number="${r}" height="${state.rowHeights[r - 1] ?? 18}"${band ? ` band="${band}"` : ''}/>`,
    )
  }
  for (let c = 1; c <= state.cols; c++) {
    parts.push(`<column col-number="${c}" width="${state.colWidths[c - 1] ?? 80}"/>`)
  }
  parts.push(
    `<paper type="${attr(state.paper.type || 'A4')}" orientation="${attr(
      state.paper.orientation || 'portrait',
    )}" paging-mode="${attr(state.paper.pagingMode || 'fitpage')}"></paper>`,
  )

  // 新规范：datasource 只作为数据集容器，不携带连接属性；
  // dataset 只保留参数与字段，SQL/连接由后端按数据集名从数据集管理服务解析。
  // 旧报表（数据集内嵌 SQL / 数据源带连接）继续按旧格式输出，避免保存时丢失 SQL。
  if (datasets.length) {
    const legacy =
      !!state.datasource.url ||
      datasets.some(
        (d) => d.managed === false || (d.managed === undefined && !!d.sql),
      )
    if (legacy) {
      const ds = state.datasource
      parts.push(
        `<datasource name="${attr(ds.name || 'datasource')}" type="jdbc" driver="${attr(ds.driver)}" ` +
          `url="${attr(ds.url)}" username="${attr(ds.username)}" password="${attr(ds.password)}">`,
      )
      for (const d of datasets) {
        parts.push(`<dataset name="${attr(d.name)}" type="sql">`)
        if (d.sql) parts.push(`<sql><![CDATA[${cdata(d.sql)}]]></sql>`)
        for (const param of d.parameters || []) {
          if (!param.name) continue
          parts.push(
            `<parameter name="${attr(param.name)}" type="${attr(param.type || 'String')}" ` +
              `default-value="${attr(param.defaultValue || '')}"/>`,
          )
        }
        for (const f of d.fields.filter(Boolean)) parts.push(`<field name="${attr(f)}"/>`)
        parts.push('</dataset>')
      }
      parts.push('</datasource>')
    } else {
      parts.push('<datasource>')
      for (const d of datasets) {
        parts.push(`<dataset name="${attr(d.name)}">`)
        for (const param of d.parameters || []) {
          if (!param.name) continue
          parts.push(
            `<parameter name="${attr(param.name)}" type="${attr(param.type || 'String')}" ` +
              `default-value="${attr(param.defaultValue || '')}"/>`,
          )
        }
        for (const f of d.fields.filter(Boolean)) parts.push(`<field name="${attr(f)}"/>`)
        parts.push('</dataset>')
      }
      parts.push('</datasource>')
    }
  }

  parts.push('</ureport>')
  return parts.join('\n')
}

function parseStyle(el: Element | null): CellStyleModel {
  const s = defaultStyle()
  if (!el) return s
  if (el.getAttribute('font-size')) s.fontSize = num(el.getAttribute('font-size'), 10)
  if (el.getAttribute('font-family')) s.fontFamily = el.getAttribute('font-family') || '宋体'
  if (el.getAttribute('align')) s.align = (el.getAttribute('align') as any) || 'center'
  if (el.getAttribute('valign')) s.valign = (el.getAttribute('valign') as any) || 'middle'
  if (el.getAttribute('forecolor')) s.forecolor = el.getAttribute('forecolor') || '0,0,0'
  if (el.getAttribute('bgcolor')) s.bgcolor = el.getAttribute('bgcolor') || ''
  if (el.getAttribute('format')) s.format = el.getAttribute('format') || ''
  if (el.getAttribute('line-height')) s.lineHeight = num(el.getAttribute('line-height'), 1)
  s.bold = bool(el.getAttribute('bold'))
  s.italic = bool(el.getAttribute('italic'))
  s.underline = bool(el.getAttribute('underline'))
  s.wrapCompute = bool(el.getAttribute('wrap-compute'))
  s.borders = noBorders()
  const sides: Array<[string, keyof CellStyleModel['borders']]> = [
    ['left-border', 'left'],
    ['right-border', 'right'],
    ['top-border', 'top'],
    ['bottom-border', 'bottom'],
  ]
  for (const [tag, side] of sides) {
    const node = el.getElementsByTagName(tag)[0]
    if (!node) continue
    const styleAttr = node.getAttribute('style') || 'solid'
    s.borders[side] = {
      style:
        styleAttr === 'none'
          ? 'none'
          : styleAttr === 'dashed' || styleAttr === 'dotted'
            ? 'dashed'
            : 'solid',
      size: num(node.getAttribute('width'), 1),
      color: node.getAttribute('color') || '0,0,0',
    }
  }
  return s
}

export function parseXml(xml: string): ReportState {
  const state = emptyReport()
  state.cells = {}
  state.datasets = []
  const doc = new DOMParser().parseFromString(xml, 'application/xml')
  const root = doc.documentElement
  if (!root || root.nodeName !== 'ureport') {
    throw new Error('不是有效的报表 XML')
  }

  const rows: Record<number, number> = {}
  const cols: Record<number, number> = {}
  let maxRow = 0
  let maxCol = 0

  Array.from(root.children).forEach((el) => {
    if (el.nodeName === 'row') {
      const r = num(el.getAttribute('row-number'))
      rows[r] = num(el.getAttribute('height'), 18)
      const band = el.getAttribute('band')
      if (band) state.rowBands[r] = band as RowBand
      maxRow = Math.max(maxRow, r)
    } else if (el.nodeName === 'column') {
      const c = num(el.getAttribute('col-number'))
      cols[c] = num(el.getAttribute('width'), 80)
      maxCol = Math.max(maxCol, c)
    } else if (el.nodeName === 'paper') {
      state.paper = {
        type: el.getAttribute('type') || 'A4',
        orientation: el.getAttribute('orientation') || 'portrait',
        pagingMode: el.getAttribute('paging-mode') || 'fitpage',
      }
    }
  })

  Array.from(root.children).forEach((el) => {
    if (el.nodeName !== 'cell') return
    const row = num(el.getAttribute('row'))
    const col = num(el.getAttribute('col'))
    const name = el.getAttribute('name') || cellName(row, col)
    const cell = createCell(name, row, col)
    cell.leftParent = el.getAttribute('left-cell') || ''
    cell.topParent = el.getAttribute('top-cell') || ''
    cell.rowSpan = num(el.getAttribute('row-span'), 1) || 1
    cell.colSpan = num(el.getAttribute('col-span'), 1) || 1
    cell.expand = (el.getAttribute('expand') as any) || 'None'
    cell.fillBlankRows = bool(el.getAttribute('fill-blank-rows'))
    cell.multiple = num(el.getAttribute('multiple'), 0)
    cell.linkUrl = el.getAttribute('link-url') || ''
    cell.linkTargetWindow = el.getAttribute('link-target-window') || '_self'

    const simple = el.getElementsByTagName('simple-value')[0]
    const expr = el.getElementsByTagName('expression-value')[0]
    const dataset = el.getElementsByTagName('dataset-value')[0]
    const image = el.getElementsByTagName('image-value')[0]
    const zxing = el.getElementsByTagName('zxing-value')[0]
    const chart = el.getElementsByTagName('chart-value')[0]
    const slash = el.getElementsByTagName('slash-value')[0]

    if (dataset) {
      cell.valueType = 'dataset'
      cell.datasetName = dataset.getAttribute('dataset-name') || ''
      cell.aggregate = (dataset.getAttribute('aggregate') as any) || 'group'
      cell.property = dataset.getAttribute('property') || ''
      cell.order = (dataset.getAttribute('order') as any) || 'none'
    } else if (expr) {
      cell.valueType = 'expression'
      cell.expression = expr.textContent || ''
    } else if (image) {
      cell.valueType = 'image'
      cell.imageSource = (image.getAttribute('source') as any) || 'text'
      cell.imageValue = image.getElementsByTagName('text')[0]?.textContent || ''
      cell.imageWidth = num(image.getAttribute('width'), 0)
      cell.imageHeight = num(image.getAttribute('height'), 0)
    } else if (zxing) {
      cell.valueType = zxing.getAttribute('category') === 'qrcode' ? 'qrcode' : 'barcode'
      cell.zxingSource = (zxing.getAttribute('source') as any) || 'text'
      cell.zxingFormat = zxing.getAttribute('format') || ''
      cell.zxingCodeDisplay = zxing.getAttribute('code-display') !== 'false'
      cell.zxingWidth = num(zxing.getAttribute('width'), 95)
      cell.zxingHeight = num(zxing.getAttribute('height'), 22)
      cell.zxingValue = zxing.getElementsByTagName('text')[0]?.textContent || ''
    } else if (chart) {
      cell.valueType = 'chart'
      const chartData = chart.getElementsByTagName('dataset')[0]
      if (chartData) {
        cell.chartType = chartData.getAttribute('type') || 'bar'
        cell.chartDatasetName = chartData.getAttribute('dataset-name') || ''
        cell.chartCategoryProperty = chartData.getAttribute('category-property') || ''
        cell.chartSeriesProperty = chartData.getAttribute('series-property') || ''
        cell.chartValueProperty = chartData.getAttribute('value-property') || ''
        cell.chartCollectType = chartData.getAttribute('collect-type') || 'select'
      }
    } else if (slash) {
      cell.valueType = 'diagonal'
      cell.slashItems = Array.from(slash.getElementsByTagName('slash')).map((item) => ({
        text: item.getAttribute('text') || '',
        x: num(item.getAttribute('x'), 0),
        y: num(item.getAttribute('y'), 0),
        degree: num(item.getAttribute('degree'), 0),
      }))
      if (!cell.slashItems.length) {
        cell.slashItems = [{ text: '', x: 0, y: 0, degree: 0 }]
      }
    } else if (simple) {
      cell.valueType = 'simple'
      cell.text = simple.textContent || ''
    }

    cell.style = parseStyle(el.getElementsByTagName('cell-style')[0] || null)

    cell.linkParameters = Array.from(el.children)
      .filter((child) => child.nodeName === 'link-parameter')
      .map((child) => ({
        name: child.getAttribute('name') || '',
        value: child.getElementsByTagName('value')[0]?.textContent || '',
      }))

    cell.conditionProperties = Array.from(el.children)
      .filter((child) => child.nodeName === 'condition-property-item')
      .map((child) => ({
        name: child.getAttribute('name') || 'condition',
        newValue: child.getAttribute('new-value') || '',
        linkUrl: child.getAttribute('link-url') || '',
        linkTargetWindow: child.getAttribute('link-target-window') || '_blank',
        type: (child.getAttribute('type') as any) || 'normal',
        conditions: Array.from(child.children)
          .filter((cond) => cond.nodeName === 'condition')
          .map((cond) => ({
            property: cond.getAttribute('property') || '',
            op: (cond.getAttribute('op') as any) || 'Equals',
            value: cond.getElementsByTagName('value')[0]?.textContent || '',
          })),
      }))

    state.cells[name] = cell
    maxRow = Math.max(maxRow, row + cell.rowSpan - 1)
    maxCol = Math.max(maxCol, col + cell.colSpan - 1)
  })

  const dsEl = Array.from(root.children).find((e) => e.nodeName === 'datasource') as Element | undefined
  if (dsEl) {
    // 兼容旧格式：旧数据源可能仍带连接属性；新格式 datasource 无属性。
    if (dsEl.attributes.length > 0) {
      state.datasource = {
        name: dsEl.getAttribute('name') || 'datasource',
        driver: dsEl.getAttribute('driver') || '',
        url: dsEl.getAttribute('url') || '',
        username: dsEl.getAttribute('username') || '',
        password: dsEl.getAttribute('password') || '',
      }
    }
    state.datasets = Array.from(dsEl.children)
      .filter((d) => d.nodeName === 'dataset')
      .map((d) => {
        const sql = d.getElementsByTagName('sql')[0]?.textContent || ''
        return {
          name: d.getAttribute('name') || '',
          sql,
          managed: !sql,
          fields: Array.from(d.children)
            .filter((f) => f.nodeName === 'field')
            .map((f) => f.getAttribute('name') || '')
            .filter(Boolean),
          parameters: Array.from(d.children)
            .filter((p) => p.nodeName === 'parameter')
            .map((p) => ({
              name: p.getAttribute('name') || '',
              type: p.getAttribute('type') || 'String',
              defaultValue: p.getAttribute('default-value') || '',
            }))
            .filter((p) => p.name),
        }
      })
  }

  state.rows = Math.max(maxRow, 10)
  state.cols = Math.max(maxCol, 8)
  state.rowHeights = Array.from({ length: state.rows }, (_, i) => rows[i + 1] ?? 18)
  state.colWidths = Array.from({ length: state.cols }, (_, i) => cols[i + 1] ?? 80)
  return state
}
