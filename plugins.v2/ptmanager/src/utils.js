/** PT管家前端共用的格式化与请求工具。 */

/** 按 1024 进制把字节数格式化为容量文本。 */
export function formatBytes(value) {
  let bytes = Number(value || 0)
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB']
  let index = 0
  while (bytes >= 1024 && index < units.length - 1) {
    bytes /= 1024
    index += 1
  }
  if (index === 0) return `${Math.round(bytes)} ${units[index]}`
  const digits = bytes < 100 ? 2 : 1
  return `${bytes.toFixed(digits)} ${units[index]}`
}

/** 兼容宿主 API、标准业务响应与 Axios 响应的常见包装形式。 */
export function unwrapResponse(response) {
  let value = response
  for (let depth = 0; depth < 3; depth += 1) {
    if (!value || typeof value !== 'object') return value
    if (Object.prototype.hasOwnProperty.call(value, 'success')) {
      if (value.success === false) throw new Error(value.message || '操作失败')
      value = value.data
      continue
    }
    if (Object.prototype.hasOwnProperty.call(value, 'data')) {
      value = value.data
      continue
    }
    break
  }
  return value
}

/** 格式化普通数值，缺失时返回占位文本。 */
export function formatNumber(value, digits = 2) {
  if (value === null || value === undefined || value === '') return '未提供'
  const number = Number(value)
  if (!Number.isFinite(number)) return String(value)
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: digits }).format(number)
}

/** 格式化整数，缺失时返回占位文本。 */
export function formatInteger(value) {
  if (value === null || value === undefined || value === '') return '未提供'
  const number = Number(value)
  if (!Number.isFinite(number)) return String(value)
  return new Intl.NumberFormat('zh-CN', { maximumFractionDigits: 0 }).format(number)
}

/** 格式化分享率，保留三位小数。 */
export function formatRatio(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return '—'
  return number.toFixed(3)
}

/** 把时间文本裁剪为「月-日 时:分」，便于表格展示。 */
export function shortTime(value) {
  const text = String(value || '').trim()
  if (!text) return '—'
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})[ T]?(\d{2}:\d{2})?/)
  if (!match) return text
  return `${match[2]}-${match[3]}${match[4] ? ` ${match[4]}` : ''}`
}

/** 把加入日期裁剪为日期部分。 */
export function shortDate(value) {
  const text = String(value || '').trim()
  if (!text) return '—'
  const match = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return match ? `${match[1]}-${match[2]}-${match[3]}` : text
}

/** 创建包含重复查询参数的 URL。 */
export function withQuery(path, query = {}) {
  const params = new URLSearchParams()
  Object.entries(query).forEach(([key, value]) => {
    if (value === null || value === undefined || value === '') return
    params.set(key, Array.isArray(value) ? value.join(',') : String(value))
  })
  const suffix = params.toString()
  return suffix ? `${path}?${suffix}` : path
}

const iconCache = new Map()

/** 通过宿主站点图标 API 获取图标并跨组件缓存。 */
export async function getSiteIcon(api, siteId) {
  if (!siteId) return ''
  if (iconCache.has(siteId)) return iconCache.get(siteId)
  try {
    const response = await api.get(`site/icon/${siteId}`, { feedback: 'silent' })
    const data = unwrapResponse(response)
    const icon = typeof data === 'string' ? data : data?.icon || data?.base64 || data?.url || ''
    iconCache.set(siteId, icon)
    return icon
  } catch {
    iconCache.set(siteId, '')
    return ''
  }
}

/** 分享率对应的语义配色。 */
export function ratioColor(value) {
  const number = Number(value)
  if (!Number.isFinite(number) || number <= 0) return 'grey'
  if (number >= 2) return 'success'
  if (number >= 1) return 'primary'
  if (number >= 0.6) return 'warning'
  return 'error'
}

/** 站点数据新鲜度文案与配色。 */
export function freshness(updatedAt) {
  const text = String(updatedAt || '').trim()
  if (!text) return { label: '无数据', color: 'error' }
  const parsed = new Date(text.replace(' ', 'T'))
  if (Number.isNaN(parsed.getTime())) return { label: text, color: 'grey' }
  const hours = (Date.now() - parsed.getTime()) / 3600000
  if (hours <= 26) return { label: shortTime(text), color: 'success' }
  if (hours <= 72) return { label: shortTime(text), color: 'warning' }
  return { label: shortTime(text), color: 'error' }
}
