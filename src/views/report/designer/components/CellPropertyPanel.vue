<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useDesignerStore } from '@/stores'
import { AGGREGATE_OPTIONS, ORDER_OPTIONS } from '@/constants'
import { createCell, parseCellName, type CellModel } from '@/model/types'
import AppIcon from './AppIcon.vue'
import ParentPicker from './ParentPicker.vue'
import LinkParamDialog from './LinkParamDialog.vue'
import ConditionDialog from './ConditionDialog.vue'

const CELL_TYPES = [
  { value: 'simple', label: '普通文本' },
  { value: 'expression', label: '表达式' },
  { value: 'dataset', label: '数据集' },
  { value: 'image', label: '图片' },
  { value: 'diagonal', label: '斜表头' },
  { value: 'qrcode', label: '二维码' },
  { value: 'barcode', label: '条码' },
  { value: 'chart', label: '图表' },
]
const CHART_TYPES = [
  { value: 'bar', label: '柱状图' },
  { value: 'line', label: '折线图' },
  { value: 'pie', label: '饼图' },
  { value: 'doughnut', label: '环形图' },
  { value: 'area', label: '面积图' },
  { value: 'horizontalBar', label: '条形图' },
  { value: 'radar', label: '雷达图' },
  { value: 'polarArea', label: '极坐标图' },
  { value: 'scatter', label: '散点图' },
  { value: 'bubble', label: '气泡图' },
]
const CHART_AGGREGATES = [
  { value: 'select', label: '列表' },
  { value: 'count', label: '计数' },
  { value: 'sum', label: '求和' },
  { value: 'avg', label: '平均' },
  { value: 'max', label: '最大' },
  { value: 'min', label: '最小' },
]

const store = useDesignerStore()
const draft = ref<CellModel | null>(null)
const cell = computed(() => store.selectedCell || draft.value)
const datasetNames = computed(() => store.model.datasets.map((d) => d.name).filter(Boolean))
const linkDialog = ref(false)
const conditionDialog = ref(false)
const conditionSummary = computed(() => {
  const items = cell.value?.conditionProperties || []
  const count = items.reduce((sum, item) => sum + item.conditions.length, 0)
  return count ? `已配置 ${count} 条条件` : '条件配置'
})
const expressionArea = ref<HTMLTextAreaElement | null>(null)
const expressionGutter = ref<HTMLElement | null>(null)
const expressionLines = computed(() => {
  const value = cell.value?.expression || ''
  return Array.from({ length: Math.max(1, value.split('\n').length) }, (_, index) => index + 1)
})
const zxingArea = ref<HTMLTextAreaElement | null>(null)
const zxingGutter = ref<HTMLElement | null>(null)
const zxingLines = computed(() => {
  const value = cell.value?.zxingValue || ''
  return Array.from({ length: Math.max(1, value.split('\n').length) }, (_, index) => index + 1)
})

function syncExpressionScroll() {
  if (expressionGutter.value && expressionArea.value) {
    expressionGutter.value.scrollTop = expressionArea.value.scrollTop
  }
}

function syncZxingScroll() {
  if (zxingGutter.value && zxingArea.value) {
    zxingGutter.value.scrollTop = zxingArea.value.scrollTop
  }
}

function makeDraft(name: string): CellModel | null {
  const pos = parseCellName(name)
  return pos ? createCell(name, pos.row, pos.col) : null
}

watch(
  () => [store.selected, store.selectedCell] as const,
  () => {
    if (store.selectedCell) {
      draft.value = null
      return
    }
    if (!draft.value || draft.value.name !== store.selected) {
      draft.value = makeDraft(store.selected)
    }
  },
  { immediate: true },
)

function persistDraft() {
  const value = draft.value
  if (!value) return
  const target = store.ensureCell(value.name, value.row, value.col)
  Object.assign(target, JSON.parse(JSON.stringify(value)))
  draft.value = null
}

function ensureStoredCell() {
  if (!store.selectedCell) persistDraft()
  return store.selectedCell
}

function openLinkDialog() {
  if (!ensureStoredCell()) return
  linkDialog.value = true
}

function openConditionDialog() {
  if (!ensureStoredCell()) return
  conditionDialog.value = true
}

function adjustLineHeight(delta: number) {
  if (!cell.value) return
  const current = Number(cell.value.style.lineHeight || 1)
  cell.value.style.lineHeight = Math.max(0.1, Math.round((current + delta) * 10) / 10)
  if (draft.value) persistDraft()
}

function setImageSize(key: 'imageWidth' | 'imageHeight', raw: string) {
  if (!cell.value) return
  const value = Number(raw)
  cell.value[key] = Number.isFinite(value) && value > 0 ? Math.round(value) : 0
  if (draft.value) persistDraft()
}

function adjustImageSize(key: 'imageWidth' | 'imageHeight', delta: number) {
  if (!cell.value) return
  const next = Math.max(0, (Number(cell.value[key]) || 0) + delta)
  cell.value[key] = next
  if (draft.value) persistDraft()
}

function setZxingSize(key: 'zxingWidth' | 'zxingHeight', raw: string) {
  if (!cell.value) return
  const value = Number(raw)
  cell.value[key] = Number.isFinite(value) && value > 0 ? Math.round(value) : 0
  if (draft.value) persistDraft()
}

function adjustZxingSize(key: 'zxingWidth' | 'zxingHeight', delta: number) {
  if (!cell.value) return
  const next = Math.max(0, (Number(cell.value[key]) || 0) + delta)
  cell.value[key] = next
  if (draft.value) persistDraft()
}

function adjustSlash(index: number, key: 'x' | 'y' | 'degree', delta: number) {
  const item = cell.value?.slashItems[index]
  if (!item) return
  item[key] = Math.max(0, (Number(item[key]) || 0) + delta)
  if (draft.value) persistDraft()
}

function addSlash() {
  if (!cell.value) return
  cell.value.slashItems.push({
    text: `项目${cell.value.slashItems.length + 1}`,
    x: 0,
    y: 0,
    degree: 0,
  })
  if (draft.value) persistDraft()
}

function removeSlash(index: number) {
  if (!cell.value || cell.value.slashItems.length <= 1) return
  cell.value.slashItems.splice(index, 1)
  if (draft.value) persistDraft()
}
</script>

<template>
  <div class="sidebar-body" @input="persistDraft" @change="persistDraft">
    <h3>单元格属性 · {{ store.selected }}</h3>

    <template v-if="cell">
      <div class="parent-section">
        <ParentPicker v-model="cell.leftParent" label="左父格" kind="left" />
        <ParentPicker v-model="cell.topParent" label="上父格" kind="top" />
      </div>

      <div class="form-row">
        <label>单元格类型</label>
        <select v-model="cell.valueType">
          <option v-for="t in CELL_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
        </select>
      </div>

      <template v-if="cell.valueType === 'dataset'">
        <div class="form-row">
          <label>数据集</label>
          <input v-model="cell.datasetName" list="dataset-names" placeholder="数据集名" />
          <datalist id="dataset-names">
            <option v-for="n in datasetNames" :key="n" :value="n" />
          </datalist>
        </div>
        <div class="form-row">
          <label>聚合方式</label>
          <select v-model="cell.aggregate">
            <option v-for="a in AGGREGATE_OPTIONS" :key="a.value" :value="a.value">{{ a.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label>字段</label>
          <input v-model="cell.property" placeholder="数据库字段" />
        </div>
        <div class="form-row">
          <label>排序</label>
          <select v-model="cell.order">
            <option v-for="o in ORDER_OPTIONS" :key="o.value" :value="o.value">{{ o.label }}</option>
          </select>
        </div>
      </template>

      <template v-if="cell.valueType === 'chart'">
        <div class="form-row">
          <label>图表类型</label>
          <select v-model="cell.chartType">
            <option v-for="t in CHART_TYPES" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </div>
        <div class="form-row">
          <label>数据集</label>
          <input v-model="cell.chartDatasetName" list="dataset-names" placeholder="数据集名" />
        </div>
        <div class="form-row">
          <label>分类字段</label>
          <input v-model="cell.chartCategoryProperty" placeholder="category-property" />
        </div>
        <div class="form-row">
          <label>系列字段</label>
          <input v-model="cell.chartSeriesProperty" placeholder="series-property" />
        </div>
        <div class="form-row">
          <label>值字段</label>
          <input v-model="cell.chartValueProperty" placeholder="value-property" />
        </div>
        <div class="form-row">
          <label>聚合方式</label>
          <select v-model="cell.chartCollectType">
            <option v-for="a in CHART_AGGREGATES" :key="a.value" :value="a.value">{{ a.label }}</option>
          </select>
        </div>
      </template>

      <h3 class="section-title">链接配置</h3>
      <div class="form-row">
        <label>链接地址</label>
        <input v-model="cell.linkUrl" placeholder="支持表达式，表达式定义在 ${...} 中" />
      </div>
      <div class="form-row">
        <label>目标窗口</label>
        <select v-model="cell.linkTargetWindow">
          <option value="_blank">新窗口</option>
          <option value="_self">当前窗口</option>
        </select>
        <button type="button" class="section-btn" @click="openLinkDialog">URL参数配置</button>
      </div>

      <h3 class="section-title">条件配置</h3>
      <div class="form-row">
        <label>条件属性</label>
        <button type="button" class="condition-btn" @click="openConditionDialog">
          <AppIcon name="filter" :size="16" />
          <span>{{ conditionSummary }}</span>
        </button>
      </div>

      <template v-if="cell.valueType === 'qrcode' || cell.valueType === 'barcode'">
        <h3 class="section-title">{{ cell.valueType === 'qrcode' ? '二维码配置' : '条码配置' }}</h3>
        <div class="expr-row">
          <span class="expr-label">宽：</span>
          <div class="stepper">
            <button type="button" class="stepper-btn" @click="adjustZxingSize('zxingWidth', -10)">−</button>
            <input
              :value="cell.zxingWidth || ''"
              type="number"
              min="0"
              step="1"
              @input="setZxingSize('zxingWidth', ($event.target as HTMLInputElement).value)"
            />
            <button type="button" class="stepper-btn" @click="adjustZxingSize('zxingWidth', 10)">+</button>
          </div>
        </div>
        <div class="expr-row">
          <span class="expr-label">高：</span>
          <div class="stepper">
            <button type="button" class="stepper-btn" @click="adjustZxingSize('zxingHeight', -10)">−</button>
            <input
              :value="cell.zxingHeight || ''"
              type="number"
              min="0"
              step="1"
              @input="setZxingSize('zxingHeight', ($event.target as HTMLInputElement).value)"
            />
            <button type="button" class="stepper-btn" @click="adjustZxingSize('zxingHeight', 10)">+</button>
          </div>
        </div>
        <div class="expr-row">
          <span class="expr-label">数据来源：</span>
          <select class="expr-select" v-model="cell.zxingSource">
            <option value="text">文本</option>
            <option value="expression">表达式</option>
          </select>
        </div>

        <template v-if="cell.zxingSource === 'text'">
          <div class="expr-row">
            <span class="expr-label">文本：</span>
            <input class="expr-format" v-model="cell.zxingValue" placeholder="条码/二维码内容" />
          </div>
        </template>

        <template v-else>
          <div class="expr-row">
            <span class="expr-label">内容展开方向：</span>
            <label class="expr-radio">
              <input type="radio" name="zxing-expand" value="Down" v-model="cell.expand" />
              <span>向下</span>
            </label>
            <label class="expr-radio">
              <input type="radio" name="zxing-expand" value="Right" v-model="cell.expand" />
              <span>向右</span>
            </label>
            <label class="expr-radio">
              <input type="radio" name="zxing-expand" value="None" v-model="cell.expand" />
              <span>不展开</span>
            </label>
          </div>
          <div class="expr-row expr-row-top">
            <span class="expr-label">表达式：</span>
            <div class="code-editor">
              <div ref="zxingGutter" class="code-gutter">
                <div v-for="n in zxingLines" :key="n">{{ n }}</div>
              </div>
              <textarea
                ref="zxingArea"
                v-model="cell.zxingValue"
                class="code-textarea"
                spellcheck="false"
                @scroll="syncZxingScroll"
              />
            </div>
          </div>
        </template>
      </template>

      <template v-if="cell.valueType === 'diagonal'">
        <h3 class="section-title">斜表头配置</h3>
        <div v-for="(item, index) in cell.slashItems" :key="index" class="slash-item">
          <div class="expr-row">
            <span class="expr-label">名称：</span>
            <input class="expr-format" v-model="item.text" placeholder="项目名称" />
          </div>
          <div class="expr-row">
            <span class="expr-label">Y：</span>
            <div class="stepper">
              <button type="button" class="stepper-btn" @click="adjustSlash(index, 'y', -1)">−</button>
              <input v-model.number="item.y" type="number" step="1" />
              <button type="button" class="stepper-btn" @click="adjustSlash(index, 'y', 1)">+</button>
            </div>
          </div>
          <div class="expr-row">
            <span class="expr-label">X：</span>
            <div class="stepper">
              <button type="button" class="stepper-btn" @click="adjustSlash(index, 'x', -1)">−</button>
              <input v-model.number="item.x" type="number" step="1" />
              <button type="button" class="stepper-btn" @click="adjustSlash(index, 'x', 1)">+</button>
            </div>
          </div>
          <div class="expr-row">
            <span class="expr-label">角度：</span>
            <div class="stepper">
              <button type="button" class="stepper-btn" @click="adjustSlash(index, 'degree', -1)">−</button>
              <input v-model.number="item.degree" type="number" step="1" />
              <button type="button" class="stepper-btn" @click="adjustSlash(index, 'degree', 1)">+</button>
            </div>
          </div>
          <div v-if="cell.slashItems.length > 1" class="slash-actions">
            <button type="button" @click="removeSlash(index)">删除</button>
          </div>
        </div>
        <button type="button" class="dialog-add" @click="addSlash">+ 添加斜线</button>
      </template>

      <template v-if="cell.valueType === 'image'">
        <h3 class="section-title">图片配置</h3>
        <div class="expr-row">
          <span class="expr-label">宽(px)：</span>
          <div class="stepper">
            <button type="button" class="stepper-btn" @click="adjustImageSize('imageWidth', -10)">−</button>
            <input
              :value="cell.imageWidth || ''"
              type="number"
              min="0"
              step="1"
              @input="setImageSize('imageWidth', ($event.target as HTMLInputElement).value)"
            />
            <button type="button" class="stepper-btn" @click="adjustImageSize('imageWidth', 10)">+</button>
          </div>
        </div>
        <div class="expr-row">
          <span class="expr-label">高(px)：</span>
          <div class="stepper">
            <button type="button" class="stepper-btn" @click="adjustImageSize('imageHeight', -10)">−</button>
            <input
              :value="cell.imageHeight || ''"
              type="number"
              min="0"
              step="1"
              @input="setImageSize('imageHeight', ($event.target as HTMLInputElement).value)"
            />
            <button type="button" class="stepper-btn" @click="adjustImageSize('imageHeight', 10)">+</button>
          </div>
        </div>
        <div class="expr-row">
          <span class="expr-label">图片来源：</span>
          <select class="expr-select" v-model="cell.imageSource">
            <option value="text">路径</option>
            <option value="expression">表达式</option>
          </select>
        </div>
        <div class="expr-row">
          <span class="expr-label">路径：</span>
          <input
            class="expr-format"
            v-model="cell.imageValue"
            :placeholder="
              cell.imageSource === 'text'
                ? '默认支持以classpath:开头，位于classpath下'
                : '支持表达式，如 ${...}'
            "
          />
        </div>
      </template>

      <template v-if="cell.valueType === 'expression'">
        <h3 class="section-title">表达式配置</h3>
        <div class="expr-row">
          <span class="expr-label">换行计算：</span>
          <label class="expr-radio">
            <input type="radio" name="expr-wrap" :value="true" v-model="cell.style.wrapCompute" />
            <span>打开</span>
          </label>
          <label class="expr-radio">
            <input type="radio" name="expr-wrap" :value="false" v-model="cell.style.wrapCompute" />
            <span>关闭</span>
          </label>
        </div>
        <div class="expr-row">
          <span class="expr-label">数据展开方向：</span>
          <label class="expr-radio">
            <input type="radio" name="expr-expand" value="Down" v-model="cell.expand" />
            <span>向下</span>
          </label>
          <label class="expr-radio">
            <input type="radio" name="expr-expand" value="Right" v-model="cell.expand" />
            <span>向右</span>
          </label>
          <label class="expr-radio">
            <input type="radio" name="expr-expand" value="None" v-model="cell.expand" />
            <span>不展开</span>
          </label>
        </div>
        <div class="expr-row">
          <span class="expr-label">格式化：</span>
          <input class="expr-format" v-model="cell.style.format" placeholder="对日期或数字格式化，如#.##" />
        </div>
        <div class="expr-row expr-row-top">
          <span class="expr-label">表达式：</span>
          <div class="code-editor">
            <div ref="expressionGutter" class="code-gutter">
              <div v-for="n in expressionLines" :key="n">{{ n }}</div>
            </div>
            <textarea
              ref="expressionArea"
              v-model="cell.expression"
              class="code-textarea"
              spellcheck="false"
              @scroll="syncExpressionScroll"
            />
          </div>
        </div>
      </template>

      <template v-if="cell.valueType === 'simple'">
        <h3 class="section-title">文本配置</h3>
        <div class="form-row">
          <label>行高</label>
          <div class="stepper">
            <button type="button" class="stepper-btn" @click="adjustLineHeight(-1)">−</button>
            <input v-model.number="cell.style.lineHeight" type="number" step="0.1" min="0.1" />
            <button type="button" class="stepper-btn" @click="adjustLineHeight(1)">+</button>
          </div>
        </div>
        <div class="form-row form-row-top">
          <label>文本内容</label>
          <textarea v-model="cell.text" class="text-content" placeholder="请输入文本内容" />
        </div>
      </template>

      <LinkParamDialog
        v-model:show="linkDialog"
        :params="cell.linkParameters || []"
        @save="cell.linkParameters = $event"
      />
      <ConditionDialog
        v-model:show="conditionDialog"
        :items="cell.conditionProperties || []"
        @save="cell.conditionProperties = $event"
      />
    </template>

    <div v-else class="empty-tip">请选择一个单元格</div>
  </div>
</template>
