/** 颜色 "r,g,b" → CSS rgb() */
export function toCssColor(value: string): string | undefined {
  if (!value) return undefined
  const parts = value.split(',').map((v) => v.trim())
  if (parts.length === 3 && parts.every((p) => p !== '' && !Number.isNaN(Number(p)))) {
    return `rgb(${parts[0]},${parts[1]},${parts[2]})`
  }
  return value
}

/** 触发浏览器下载 */
export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** 防抖 */
export function debounce<T extends (...args: any[]) => void>(fn: T, delay = 200) {
  let timer: number | undefined
  return (...args: Parameters<T>) => {
    if (timer) window.clearTimeout(timer)
    timer = window.setTimeout(() => fn(...args), delay)
  }
}
