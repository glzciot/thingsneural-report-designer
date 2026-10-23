<script setup lang="ts">
import { computed } from 'vue'

const props = withDefaults(defineProps<{ name: string; size?: number }>(), { size: 18 })

const paths: Record<string, string[]> = {
  new: ['M6 2h7l5 5v15H6z', 'M13 2v5h5', 'M12 12v6', 'M9 15h6'],
  save: ['M4 3h13l3 3v15H4z', 'M8 3v6h8V3', 'M8 13h8v8H8z'],
  saveAs: ['M4 3h13l3 3v15H4z', 'M8 3v6h8V3', 'M8 13h8v6H8z', 'M16 18h6', 'M19 15v6'],
  open: ['M3 7h7l2 2h9v10H3z', 'M3 7V5h6l2 2'],
  refresh: ['M20 12a8 8 0 1 1-2.34-5.66', 'M20 4v5h-5'],
  undo: ['M9 7L4 12l5 5', 'M4 12h9a6 6 0 0 1 6 6'],
  redo: ['M15 7l5 5-5 5', 'M20 12h-9a6 6 0 0 0-6 6'],
  eye: [
    'M2 12s4-7 10-7 10 7 10 7-4 7-10 7S2 12 2 12z',
    'M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z',
  ],
  print: ['M6 9V3h12v6', 'M6 18H4v-6h16v6h-2', 'M6 14h12v7H6z'],
  settings: [
    'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z',
    'M12 2v3',
    'M12 19v3',
    'M2 12h3',
    'M19 12h3',
    'M4.9 4.9l2.1 2.1',
    'M17 17l2.1 2.1',
    'M19.1 4.9L17 7',
    'M7 17l-2.1 2.1',
  ],
  help: [
    'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z',
    'M9.5 9a2.5 2.5 0 1 1 4.5 1.5c-.8.8-2 1-2 2.5',
    'M12 17h.01',
  ],
  merge: ['M4 5h16v14H4z', 'M12 5v14', 'M8 12h8'],
  alignLeft: ['M4 6h16', 'M4 10h10', 'M4 14h16', 'M4 18h10'],
  alignCenter: ['M4 6h16', 'M7 10h10', 'M4 14h16', 'M7 18h10'],
  alignRight: ['M4 6h16', 'M10 10h10', 'M4 14h16', 'M10 18h10'],
  border: ['M4 4h16v16H4z', 'M4 12h16', 'M12 4v16'],
  image: [
    'M4 5h16v14H4z',
    'M8 9a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3z',
    'M4 17l5-5 4 4 3-3 4 4',
  ],
  chart: ['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M22 20H2'],
  database: [
    'M4 6c0-2 16-2 16 0s-16 2-16 0z',
    'M4 6v12c0 2 16 2 16 0V6',
    'M4 12c0 2 16 2 16 0',
  ],
  dataset: ['M12 3l8 4.5v9L12 21l-8-4.5v-9z', 'M12 3v18', 'M4 7.5l8 4.5 8-4.5'],
  share: ['M5 10h4v4H5z', 'M15 4h4v4h-4z', 'M15 16h4v4h-4z', 'M9 12h3V6h3', 'M9 12h3v6h3'],
  delete: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13', 'M10 11v6', 'M14 11v6'],
  plus: ['M12 5v14', 'M5 12h14'],
  minus: ['M5 12h14'],
  chevronDown: ['M6 9l6 6 6-6'],
  palette: ['M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 0-4h-1a2 2 0 0 1 0-4h4a3 3 0 0 0 3-3 9 9 0 0 0-7-7z'],
  font: ['M6 18L12 5l6 13', 'M8 14h8'],
  rowPlus: ['M3 5h18', 'M3 10h18', 'M12 13v8', 'M8 17h8'],
  rowMinus: ['M3 5h18', 'M3 10h18', 'M8 17h8'],
  colPlus: ['M5 3v18', 'M10 3v18', 'M13 12h8', 'M17 8v8'],
  colMinus: ['M5 3v18', 'M10 3v18', 'M13 18h8'],
  rowDelete: ['M3 5h18', 'M3 10h18', 'M8 15l8 6', 'M16 15l-8 6'],
  colDelete: ['M5 3v18', 'M10 3v18', 'M14 9l7 7', 'M21 9l-7 7'],
  rowHeight: ['M3 5h18', 'M3 19h18', 'M12 8v8', 'M9 10l3-3 3 3', 'M9 14l3 3 3-3'],
  colWidth: ['M5 3v18', 'M19 3v18', 'M8 12h8', 'M10 9l-3 3 3 3', 'M14 9l3 3-3 3'],
  titleRow: ['M5 5h14', 'M12 5v14', 'M9 19h6'],
  summary: ['M6 5h12', 'M6 19h12', 'M8 5l4 7 4-7', 'M12 12v7'],
  ban: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M6 6l12 12'],
  copy: ['M8 8h11v13H8z', 'M5 5h11v3', 'M5 5v13h3'],
  paste: ['M8 5h8v3H8z', 'M6 7H4v14h16V7h-2', 'M9 12h6', 'M9 16h6'],
  eraser: ['M4 20h16', 'M6 17l9-9 4 4-9 9z', 'M10 8l4 4'],
  clearAll: ['M4 7h16', 'M9 7V4h6v3', 'M6 7l1 13h10l1-13', 'M10 11l4 4', 'M14 11l-4 4'],
  filter: ['M3 5h18l-7 8v6l-4 2v-8z'],
  splitMerge: ['M4 5h16v14H4z', 'M9 5v14', 'M13 12h6', 'M16 9l3 3-3 3'],
  valign: ['M4 4h16', 'M8 9h8', 'M12 12v8', 'M8 16l4 4 4-4'],
  lock: ['M6 10h12v10H6z', 'M9 10V7a3 3 0 0 1 6 0v3'],
  diagonal: ['M4 4h16v16H4z', 'M5 19L19 5'],
  chartPie: ['M12 3a9 9 0 1 0 9 9h-9z', 'M12 3v9h9'],
  gridPlus: ['M4 4h16v16H4z', 'M10 4v16', 'M16 4v16', 'M4 10h16', 'M4 16h16', 'M18 1v6', 'M15 4h6'],
  fill: ['M5 12l7-7 7 7-7 7z', 'M4 20h16', 'M19 16c1.2 1.6 2 2.4 2 3.2a2 2 0 1 1-4 0c0-.8.8-1.6 2-3.2z'],
}

const list = computed(() => paths[props.name] || [])
</script>

<template>
  <svg
    :width="size"
    :height="size"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    stroke-width="1.8"
    stroke-linecap="round"
    stroke-linejoin="round"
  >
    <path v-for="(d, i) in list" :key="i" :d="d" />
  </svg>
</template>
