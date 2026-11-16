<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useDisplay } from 'vuetify'
import AttentionDialog from './AttentionDialog.vue'
import MetricCard from './MetricCard.vue'
import RetirementPanel from './RetirementPanel.vue'
import InvitePanel from './InvitePanel.vue'
import SettingsForm from './SettingsForm.vue'
import SiteAvatar from './SiteAvatar.vue'
import SiteDetailDialog from './SiteDetailDialog.vue'
import {
  formatBytes,
  formatInteger,
  formatNumber,
  formatRatio,
  freshness,
  ratioColor,
  shortDate,
  shortTime,
  unwrapResponse,
  withQuery,
} from '../utils'

const props = defineProps({
  api: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: 'PTManager' },
  navKey: { type: String, default: 'main' },
  initialSettings: { type: Object, default: () => ({}) },
  hostManagedConfig: { type: Boolean, default: false },
  initialTab: { type: String, default: 'overview' },
  compact: { type: Boolean, default: false },
  showClose: { type: Boolean, default: false },
})

const emit = defineEmits(['action', 'close', 'save', 'switch'])

const display = useDisplay()
const pluginBase = computed(() => `plugin/${props.pluginId}`)

const loading = ref(false)
const collecting = ref(false)
// 正在采集的单个站点域名，用于按钮显示加载态
const collectingDomain = ref('')
const summary = ref({})
const sites = ref([])
const retirement = ref({})
const twelve = ref({ joined: 0, total: 12, percent: 0, items: [] })
// 后宫（邀请）数据与采集状态
const invite = ref({ sites: [] })
const inviteCollecting = ref(false)
const generatedAt = ref('')
const mpDataAt = ref('')
const extendedAt = ref('')
const tab = ref(props.initialTab === 'config' ? 'config' : 'overview')
const keyword = ref('')
const filter = ref('all')
const sortKey = ref('seeding_size')
const sortDesc = ref(true)
const customOrder = ref([])
const detailOpen = ref(false)
const activeSite = ref(null)
const attentionOpen = ref(false)
const attentionTab = ref('hr')
const snackbar = ref({ show: false, text: '', color: 'success' })
const bodyRef = ref(null)
const dragFrom = ref(-1)
const dragTo = ref(-1)
const dragging = ref(false)
let pollTimer = null
// 采集进度（阶段 + 已完成/总数），用于把「采集中」变成可观测的进度
const collectProgress = ref({ phase: '', done: 0, total: 0 })

/** 采集进度的展示文案。 */
const collectProgressText = computed(() => {
  const info = collectProgress.value
  if (!info.phase) return '采集中'
  const phase = info.phase === 'refresh' ? '刷新账号数据' : '抓取页面'
  if (!info.total) return `采集中 · ${phase}`
  return `采集中 · ${phase} ${info.done}/${info.total}`
})

/** 展示一次性提示。 */
function notify(text, color = 'success') {
  snackbar.value = { show: true, text, color }
}

const allColumns = [
  { key: 'inviter', title: '邀请人', min: 96 },
  { key: 'upload', title: '上传', min: 90, numeric: true, strong: true },
  { key: 'download', title: '下载', min: 90, numeric: true, strong: true },
  { key: 'ratio', title: '分享率', min: 78, numeric: true },
  { key: 'seeding_size', title: '做种体积', min: 92, numeric: true, strong: true },
  { key: 'seeding', title: '做种数', min: 68, numeric: true },
  { key: 'bonus', title: '魔力', min: 92, numeric: true },
  { key: 'hourly', title: '时魔', min: 88, numeric: true },
  { key: 'seeding_points', title: '做种积分', min: 92, numeric: true },
  { key: 'invites', title: '邀请', min: 84 },
  { key: 'hr', title: 'H&R', min: 64, numeric: true },
  { key: 'claims', title: '认领', min: 88 },
  { key: 'leeching', title: '下载中', min: 72, numeric: true },
  { key: 'join_at', title: '加入', min: 92 },
  { key: 'updated_at', title: '数据时间', min: 88 },
]
const visibleColumns = ref([
  'inviter',
  'upload',
  'download',
  'ratio',
  'seeding_size',
  'seeding',
  'bonus',
  'hourly',
  'updated_at',
])

/** 用户自定义的列顺序（列 key 数组），空表示使用默认顺序。 */
const customColumnOrder = ref([])

/** 按自定义顺序重排后的列定义。 */
const orderedAllColumns = computed(() => {
  const order = customColumnOrder.value
  if (!order.length) return allColumns
  const byKey = new Map(allColumns.map(column => [column.key, column]))
  const ordered = order.map(key => byKey.get(key)).filter(Boolean)
  // 追加尚未纳入顺序的新列，保证升级后新增列不会消失
  const rest = allColumns.filter(column => !order.includes(column.key))
  return [...ordered, ...rest]
})

const activeColumns = computed(() =>
  orderedAllColumns.value.filter(column => visibleColumns.value.includes(column.key)),
)

// 可见列变化时自动保存（首次加载不算用户操作）。
const columnsReady = ref(false)
watch(
  visibleColumns,
  () => {
    if (columnsReady.value) saveViewState()
  },
  { deep: true },
)

/**
 * 卡片视图展示的字段：完全跟随「列」菜单的选择。
 * 勾选多少就显示多少，按 3 列自动往下换行扩展。
 */
const cardColumns = computed(() => activeColumns.value)

const gridTemplate = computed(
  () =>
    `minmax(220px, 1.5fr) ${activeColumns.value
      .map(column => `minmax(${column.min}px, 1fr)`)
      .join(' ')}`,
)

/**
 * 表格最小总宽：站点列下限 + 各列下限 + 列间距。
 *
 * grid 的 fr 单位在空间不足时会把列压到下限以下导致内容被切，
 * 因此显式给出行宽，让外层横向滚动能滚到最后一列。
 */
const tableMinWidth = computed(() => {
  // 站点列下限与 gridTemplate 保持一致，保证失败标签不会被挤掉
  const siteMin = 220
  const columnsMin = activeColumns.value.reduce((sum, column) => sum + (column.min || 80), 0)
  const gaps = (activeColumns.value.length + 1) * 8
  return siteMin + columnsMin + gaps
})

const tableStyle = computed(() => ({ minWidth: `${tableMinWidth.value}px` }))

// 只有真正的窄屏才切换卡片；插件详情页（compact）也保留表格，
// 因为表格才能横向对比各站点的上传/下载/分享率等数据。
// 视图模式由插件设置决定（优先用接口读到的值，其次 props）；
// 极窄屏（<760px）强制卡片，保证手机上也能正常阅读。
const overviewViewMode = ref(props.initialSettings?.overview_view === 'cards' ? 'cards' : 'table')

const overviewView = computed(() => overviewViewMode.value)

const isCardView = computed(() => {
  if (overviewView.value === 'cards') return true
  return display.width.value ? display.width.value < 760 : display.smAndDown.value
})

/** 可选的排序字段，覆盖各站点的关键指标。 */
const sortFields = [
  { key: 'custom', title: '自定义顺序' },
  { key: 'name', title: '站点名' },
  { key: 'inviter', title: '邀请人' },
  { key: 'upload', title: '上传量' },
  { key: 'download', title: '下载量' },
  { key: 'ratio', title: '分享率' },
  { key: 'seeding_size', title: '做种体积' },
  { key: 'seeding', title: '做种数' },
  { key: 'bonus', title: '魔力' },
  { key: 'hourly', title: '时魔' },
  { key: 'seeding_points', title: '做种积分' },
  { key: 'invites', title: '邀请名额' },
  { key: 'hr', title: 'H&R' },
  { key: 'claims', title: '认领' },
  { key: 'leeching', title: '下载中' },
  { key: 'join_at', title: '加入日期' },
  { key: 'updated_at', title: '数据时间' },
]
const sortLabel = computed(
  () => sortFields.find(field => field.key === sortKey.value)?.title || '排序',
)

/** 读取总览数据。 */
async function load(silent = false) {
  if (!silent) loading.value = true
  try {
    const data = unwrapResponse(await props.api.get(`${pluginBase.value}/overview`, { feedback: 'silent' }))
    summary.value = data?.summary || {}
    sites.value = data?.sites || []
    retirement.value = data?.retirement || {}
    twelve.value = data?.twelve || { joined: 0, total: 12, percent: 0, items: [] }
    invite.value = data?.invite || { sites: [] }
    generatedAt.value = data?.generated_at || ''
    mpDataAt.value = data?.mp_data_at || ''
    extendedAt.value = data?.extended_at || ''
    collecting.value = Boolean(data?.collecting)
    // 打开页面时若采集已在跑，直接接上进度轮询，避免只显示静态「采集中」
    if (collecting.value && !pollTimer) startPolling()
  } catch (error) {
    notify(`读取站点数据失败：${error.message}`, 'error')
  } finally {
    loading.value = false
  }
}

/** 读取插件设置里的自定义顺序（总览页需要据此排序）。 */
async function loadOrder() {
  try {
    const data = unwrapResponse(await props.api.get(`${pluginBase.value}/settings`, { feedback: 'silent' }))
    const order = data?.settings?.site_order
    if (Array.isArray(order)) customOrder.value = order
    // 总览视图模式以插件设置为准；插件详情页不会传 initialSettings，
    // 所以必须在这里读取，否则选项改了也不生效。
    const view = data?.settings?.overview_view
    if (view === 'cards' || view === 'table') overviewViewMode.value = view
    // 列顺序同样以插件设置为准
    const columnOrder = data?.settings?.column_order
    if (Array.isArray(columnOrder) && columnOrder.length) customColumnOrder.value = columnOrder
    // 排序与可见列也按已保存状态恢复
    const saved = data?.settings || {}
    if (saved.sort_key) sortKey.value = saved.sort_key
    if (typeof saved.sort_desc === 'boolean') sortDesc.value = saved.sort_desc
    if (Array.isArray(saved.visible_columns) && saved.visible_columns.length) {
      visibleColumns.value = saved.visible_columns
    }
  } catch {
    // 设置读取失败不影响总览展示
  }
}

/** 生成站点表格某列的展示文本。 */
function cellText(site, key) {
  const data = site.extended || {}
  switch (key) {
    case 'upload':
      return formatBytes(site.upload)
    case 'download':
      return formatBytes(site.download)
    case 'ratio':
      return formatRatio(site.ratio)
    case 'seeding_size':
      return formatBytes(site.seeding_size)
    case 'seeding':
      return formatInteger(site.seeding)
    case 'leeching':
      return formatInteger(site.leeching)
    case 'bonus':
      return site.bonus === null || site.bonus === undefined ? '—' : formatNumber(site.bonus)
    case 'hourly':
      return site.hourly_bonus === null || site.hourly_bonus === undefined
        ? '—'
        : formatNumber(site.hourly_bonus)
    case 'seeding_points':
      return data.seeding_points === null || data.seeding_points === undefined
        ? '—'
        : formatNumber(data.seeding_points)
    case 'invites': {
      if (data.invites_available === null || data.invites_available === undefined) {
        return data.invite_raw ? data.invite_raw.slice(0, 6) : '—'
      }
      return data.invites_sent ? `${data.invites_available} / ${data.invites_sent}` : String(data.invites_available)
    }
    case 'hr':
      return data.hr === null || data.hr === undefined ? '—' : formatInteger(data.hr)
    case 'claims':
      if (data.claims_used === null || data.claims_used === undefined) return '—'
      return data.claims_total ? `${data.claims_used}/${data.claims_total}` : formatInteger(data.claims_used)
    case 'join_at':
      return shortDate(site.join_at)
    case 'updated_at':
      return shortTime(site.updated_at)
    case 'inviter':
      // 站点未提供邀请人时统一显示「官方」，便于识别直邀/开放注册账号。
      return String(data.inviter || '').trim() || '官方'
    default:
      return site[key] || '—'
  }
}

/**
 * 采集失败的简短标注（站点名后面那个小标签）。
 *
 * 只保留几个字，避免撑破列宽；完整原因放在悬停提示里。
 */
function failureLabel(site) {
  const detail = failureDetail(site)
  if (!detail) return ''
  const status = detail.match(/HTTP\s*(\d{3})/i)
  if (status) {
    // 常见状态码给出更直观的说法，其余只显示码
    const map = {
      '401': '未授权',
      '403': '无权限',
      '404': '未找到',
      '429': '请求过多',
      '500': '服务异常',
      '502': '网关错误',
      '503': '维护中',
      '504': '网关超时',
    }
    return map[status[1]] || `HTTP ${status[1]}`
  }
  if (/未解析到|需要重新登录|登录/.test(detail)) return '需登录'
  if (/超时|timeout|Timeout/i.test(detail)) return '超时'
  if (/请求失败/.test(detail)) return '连接失败'
  if (/未配置 Cookie|未配置Cookie/i.test(detail)) return '无Cookie'
  if (/缺少用户 UID|缺少UID/i.test(detail)) return '无UID'
  return '采集失败'
}

/** 采集失败的完整原因（悬停提示用），优先站点页面采集的错误。 */
function failureDetail(site) {
  const extended = site.extended || {}
  if (extended.ok === false && extended.error) return String(extended.error)
  // 已成功采集的站点即使 MP 快照报错，也不按失败展示
  if (extended.ok === true) return ''
  return String(site.err_msg || '')
}

/** 时魔数据来源说明，用于悬停提示。 */
function hourlySourceText(site) {
  switch (site?.hourly_bonus_source) {
    case 'page':
      return '站点页面给出的真实时魔'
    case 'estimate':
      return '按 MoviePilot 相邻两次快照的魔力增量估算'
    case 'daily':
      return '按历史日均魔力推算（快照差值不可用时）'
    default:
      return '暂无时魔数据'
  }
}

/** 排序取值，数字列使用数值、其它列使用文本。 */
function sortValue(site, key) {
  const data = site.extended || {}
  switch (key) {
    case 'inviter':
      // 「官方」在排序时按空串处理，让有邀请人的排在前面。
      return String(data.inviter || '')
    case 'hourly':
      return Number(site.hourly_bonus) || 0
    case 'seeding_points':
      return Number(data.seeding_points) || 0
    case 'hr':
      return Number(data.hr) || 0
    case 'claims':
      return Number(data.claims_used) || 0
    case 'invites':
      return Number(data.invites_available) || 0
    case 'join_at':
      return String(site.join_at || '')
    case 'updated_at':
      return String(site.updated_at || '')
    case 'user_level':
      return String(site.user_level || '')
    case 'name':
      return String(site.name || '')
    default:
      return Number(site[key]) || 0
  }
}

/** 过滤 + 排序后的站点列表。 */
const orderedSites = computed(() => {
  const text = keyword.value.trim().toLowerCase()
  let items = sites.value
  // 「数据异常」同时覆盖 MP 快照错误与站点页面采集失败
  if (filter.value === 'error') items = items.filter(site => Boolean(failureDetail(site)))
  else if (filter.value === 'no_extended') items = items.filter(site => !site.extended?.ok)
  else if (filter.value === 'inactive') items = items.filter(site => !site.is_active)
  else if (filter.value === 'hr') items = items.filter(site => Number(site.extended?.hr) > 0)
  else if (filter.value === 'claims') items = items.filter(site => Number(site.extended?.claims_used) > 0)
  else if (filter.value === 'invite') items = items.filter(site => Number(site.extended?.invites_available) > 0)
  if (text) {
    items = items.filter(
      site =>
        String(site.name || '').toLowerCase().includes(text)
        || String(site.domain || '').toLowerCase().includes(text)
        || String(site.username || '').toLowerCase().includes(text)
        || String(site.uid || '').toLowerCase().includes(text),
    )
  }
  const sorted = [...items]
  if (sortKey.value === 'custom') {
    const index = new Map(customOrder.value.map((domain, position) => [domain, position]))
    sorted.sort((left, right) => {
      const a = index.has(left.domain) ? index.get(left.domain) : Number.MAX_SAFE_INTEGER
      const b = index.has(right.domain) ? index.get(right.domain) : Number.MAX_SAFE_INTEGER
      if (a === b) return String(left.name || '').localeCompare(String(right.name || ''))
      return a - b
    })
    return sorted
  }
  sorted.sort((left, right) => {
    const a = sortValue(left, sortKey.value)
    const b = sortValue(right, sortKey.value)
    if (a === b) return String(left.name || '').localeCompare(String(right.name || ''))
    return (a > b ? 1 : -1) * (sortDesc.value ? -1 : 1)
  })
  return sorted
})

/** 顶部合计：只保留上传、下载、做种数与做种体积。 */
const summaryCards = computed(() => {
  const data = summary.value || {}
  const count = Number(data.site_count) || 0
  return [
    {
      label: '上传合计',
      value: formatBytes(data.upload),
      hint: `综合分享率 ${formatRatio(data.ratio)}（按全部站点流量加权）`,
      icon: 'mdi-upload',
      color: 'success',
    },
    {
      label: '下载合计',
      value: formatBytes(data.download),
      hint: data.leeching ? `下载中 ${formatInteger(data.leeching)} 个` : '当前没有下载中的任务',
      icon: 'mdi-download',
      color: 'info',
    },
    {
      label: '做种数',
      value: formatInteger(data.seeding),
      hint: `来自 ${formatInteger(count)} 个站点`,
      icon: 'mdi-seed-outline',
      color: 'primary',
    },
    {
      label: '做种体积合计',
      value: formatBytes(data.seeding_size),
      hint: count ? `平均 ${formatBytes(Math.round((Number(data.seeding_size) || 0) / count))} / 站` : '',
      icon: 'mdi-harddisk',
      color: 'teal',
    },
  ]
})

/** H&R 与邀请的关注入口数据。 */
const attention = computed(() => {
  const items = sites.value || []
  const hrSites = items.filter(site => Number(site.extended?.hr) > 0)
  const hrTotal = items.reduce((sum, site) => sum + (Number(site.extended?.hr) || 0), 0)
  const available = items.reduce((sum, site) => sum + (Number(site.extended?.invites_available) || 0), 0)
  const sent = items.reduce((sum, site) => sum + (Number(site.extended?.invites_sent) || 0), 0)
  const inviteSites = items.filter(
    site =>
      Number(site.extended?.invites_available) > 0 || Number(site.extended?.invites_sent) > 0,
  )
  const known = items.filter(site => site.extended?.hr !== null && site.extended?.hr !== undefined).length
  return {
    hrTotal,
    hrCount: hrSites.length,
    known,
    available,
    sent,
    inviteCount: inviteSites.length,
  }
})

/** 切换排序字段。 */
function toggleSort(key) {
  if (sortKey.value === key) {
    sortDesc.value = !sortDesc.value
    saveViewState()
    return
  }
  sortKey.value = key
  sortDesc.value = true
  saveViewState()
}

/** 选择排序字段（菜单里点击）。 */
function chooseSort(key) {
  if (key === 'custom') {
    sortKey.value = 'custom'
    saveViewState()
    notify('已切换为自定义顺序，可拖拽左侧手柄调整', 'info')
    return
  }
  toggleSort(key)
}

/**
 * 保存总览视图状态（排序字段、方向、可见列、列顺序）。
 *
 * 防抖合并连续操作，避免连点箭头时打出多次请求。
 */
let viewSaveTimer = null
function saveViewState() {
  window.clearTimeout(viewSaveTimer)
  viewSaveTimer = window.setTimeout(async () => {
    try {
      await props.api.post(`${pluginBase.value}/view`, {
        sort_key: sortKey.value,
        sort_desc: sortDesc.value,
        visible_columns: [...visibleColumns.value],
        column_order: [...customColumnOrder.value],
      })
    } catch {
      // 保存失败不影响当前浏览，下次操作会再次尝试
    }
  }, 350)
}

/** 打开站点详情。 */
function openDetail(site) {
  activeSite.value = site
  detailOpen.value = true
}

/** 打开 H&R / 邀请明细。 */
function openAttention(which) {
  attentionTab.value = which
  attentionOpen.value = true
}

/** 从明细弹窗跳转到站点详情。 */
function openSiteFromAttention(site) {
  attentionOpen.value = false
  openDetail(site)
}

/** 拖拽手柄按下：只有鼠标才接管，触摸保留原生滚动。 */
function onHandleDown(event, index) {
  if (event.pointerType === 'touch') return
  event.preventDefault()
  event.stopPropagation()
  dragFrom.value = index
  dragTo.value = index
  dragging.value = true
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
  window.addEventListener('pointercancel', onPointerUp)
}

/** 拖拽中：按指针位置确定目标行。 */
function onPointerMove(event) {
  if (!dragging.value || !bodyRef.value) return
  // 表格与卡片两种视图共用同一套拖拽逻辑，按实际渲染的元素取行。
  const rows = Array.from(bodyRef.value.querySelectorAll('.ptm-row, .ptm-site-card'))
  let target = dragTo.value
  rows.forEach((row, index) => {
    const rect = row.getBoundingClientRect()
    if (
      event.clientX >= rect.left &&
      event.clientX <= rect.right &&
      event.clientY >= rect.top &&
      event.clientY <= rect.bottom
    ) {
      target = index
    }
  })
  if (target !== dragTo.value) dragTo.value = target
}

/** 拖拽结束：落位并保存自定义顺序。 */
function onPointerUp() {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('pointercancel', onPointerUp)
  const from = dragFrom.value
  const to = dragTo.value
  dragging.value = false
  dragFrom.value = -1
  dragTo.value = -1
  if (from >= 0 && to >= 0 && from !== to) applyReorder(from, to)
}

/** 把当前展示顺序落为自定义顺序并持久化。 */
function applyReorder(from, to) {
  const visible = orderedSites.value.map(site => site.domain)
  if (from >= visible.length || to >= visible.length) return
  const moved = visible.splice(from, 1)[0]
  visible.splice(to, 0, moved)
  const rest = sites.value.map(site => site.domain).filter(domain => !visible.includes(domain))
  const next = [...visible, ...rest]
  customOrder.value = next
  sortKey.value = 'custom'
  persistOrder(next)
}

/** 保存自定义顺序到插件配置。 */
async function persistOrder(order) {
  try {
    const data = unwrapResponse(await props.api.post(`${pluginBase.value}/order`, { order }))
    if (Array.isArray(data?.order)) customOrder.value = data.order
    notify(data?.message || '自定义顺序已保存', 'success')
  } catch (error) {
    notify(`保存自定义顺序失败：${error.message}`, 'error')
  }
}

/** 上移/下移列，并持久化列顺序。 */
async function moveColumn(index, delta) {
  const keys = orderedAllColumns.value.map(column => column.key)
  const target = index + delta
  if (target < 0 || target >= keys.length) return
  const next = [...keys]
  const [moved] = next.splice(index, 1)
  next.splice(target, 0, moved)
  customColumnOrder.value = next
  saveViewState()
}

/** 保存列顺序到插件配置（只提交 column_order，不影响其它设置）。 */
async function persistColumnOrder(order) {
  try {
    const data = unwrapResponse(
      await props.api.post(`${pluginBase.value}/columns`, { order }),
    )
    if (Array.isArray(data?.order)) customColumnOrder.value = data.order
    notify('列顺序已保存', 'success')
  } catch (error) {
    notify(`保存列顺序失败：${error.message}`, 'error')
  }
}

/** 触发采集：指定域名时同步采集，否则后台全量采集。 */
async function collect(domain) {
  if (domain) collectingDomain.value = domain
  try {
    const path = domain
      ? withQuery(`${pluginBase.value}/collect`, { domain })
      : `${pluginBase.value}/collect`
    const data = unwrapResponse(await props.api.post(path, {}))
    if (domain) {
      notify(data?.message || '采集完成', data?.ok ? 'success' : 'warning')
      await load(true)
      if (activeSite.value) {
        activeSite.value = sites.value.find(item => item.domain === activeSite.value.domain) || activeSite.value
      }
      return
    }
    notify(data?.message || '已开始后台采集', 'info')
    collecting.value = true
    startPolling()
  } catch (error) {
    notify(`采集失败：${error.message}`, 'error')
  } finally {
    if (domain) collectingDomain.value = ''
  }
}

/** 轮询采集状态，完成后刷新数据。 */
async function pollStatus() {
  try {
    const status = unwrapResponse(
      await props.api.get(`${pluginBase.value}/collect/status`, { feedback: 'silent' }),
    )
    if (status?.running) {
      collectProgress.value = {
        phase: status?.phase || '',
        done: Number(status?.done || 0),
        total: Number(status?.total || 0),
      }
      collecting.value = true
    }
    if (!status?.running) {
      stopPolling()
      collecting.value = false
      collectProgress.value = { phase: '', done: 0, total: 0 }
      notify(
        `采集完成：成功 ${status?.ok_count || 0} 个，失败 ${status?.fail_count || 0} 个`,
        (status?.fail_count || 0) > 0 ? 'warning' : 'success',
      )
      await load(true)
    }
  } catch {
    stopPolling()
    collecting.value = false
  }
}

/** 启动采集状态轮询。 */
function startPolling() {
  stopPolling()
  // 先立即取一次，避免按钮先显示没有数字的「采集中」再跳变
  pollStatus()
  pollTimer = window.setInterval(pollStatus, 4000)
}

/** 停止采集状态轮询。 */
function stopPolling() {
  if (pollTimer) {
    window.clearInterval(pollTimer)
    pollTimer = null
  }
}

/** 保存设置（宿主管理配置时由宿主接管）。 */
function handleSave(payload) {
  emit('save', payload)
}

/**
 * 判断到底由谁滚动。
 *
 * MoviePilot 不同端（桌面 / 手机网页 / 侧栏页）给插件的容器高度不一样：
 * - 宿主限高时，可用高度小于内容高度 → 插件自己开滚动；
 * - 宿主不限高时，内容自然撑开、整页滚动；此时不能再套一层滚动容器，
 *   否则滚轮会被空容器吞掉，表现为「页面划不动」。
 */
const rootRef = ref(null)
const innerScroll = ref(false)

function syncScrollMode() {
  const el = rootRef.value
  if (!el) return
  innerScroll.value = false
  window.requestAnimationFrame(() => {
    const node = rootRef.value
    if (!node) return
    // 根节点自身被压缩到比内容矮，说明宿主限高 → 启用内部滚动
    const clipped = node.scrollHeight > node.clientHeight + 2
    innerScroll.value = clipped
  })
}

/** 设置保存后刷新数据，并重新读取视图模式等展示类设置。 */
async function onSettingsSaved() {
  await Promise.all([load(true), loadOrder()])
}

/** 采集后宫（邀请）数据：抓取各站邀请页的被邀者列表。 */
async function collectInvite() {
  if (inviteCollecting.value) return
  inviteCollecting.value = true
  try {
    const data = unwrapResponse(
      await props.api.post(`${pluginBase.value}/invite/collect`, {}),
    )
    notify(data?.message || '后宫数据采集完成', data?.ok ? 'success' : 'warning')
    await load(true)
  } catch (error) {
    notify(`后宫采集失败：${error.message}`, 'error')
  } finally {
    inviteCollecting.value = false
  }
}

/**
 * 按窗口在页面中的真实位置计算可用高度。
 *
 * 用 100vh 估算会在插件页（有宿主头部/侧栏）里算得过高，导致窗口底部超出
 * 可视区、内容被裁掉且滚不到。这里直接测量窗口顶部到视口底部的距离。
 */


onMounted(async () => {
  await Promise.all([load(), loadOrder()])
  // 首次加载完成后再开启自动保存，避免把默认值覆盖掉已保存的设置
  columnsReady.value = true
  syncScrollMode()
  window.addEventListener('resize', syncScrollMode)
})
onBeforeUnmount(() => {
  stopPolling()
  window.removeEventListener('resize', syncScrollMode)
})

defineExpose({ load, collect })
</script>

<template>
  <div
    ref="rootRef"
    class="ptm-root"
    :class="{ 'ptm-root--compact': compact, 'ptm-root--inner-scroll': innerScroll }"
  >
    <div class="ptm-tabbar">
      <VTabs v-model="tab" density="comfortable" color="primary" class="ptm-tabs">
        <VTab value="overview" prepend-icon="mdi-view-dashboard-variant-outline">总览</VTab>
        <VTab value="retirement" prepend-icon="mdi-shield-sun-outline">养老进度</VTab>
        <VTab value="invite" prepend-icon="mdi-account-multiple-outline">后宫</VTab>
        <VTab value="config" prepend-icon="mdi-cog-outline">设置</VTab>
      </VTabs>
      <VBtn
        v-if="showClose"
        class="ptm-tabbar__close"
        icon="mdi-close"
        size="small"
        variant="text"
        @click="emit('close')"
      />
    </div>

    <VWindow v-model="tab" class="ptm-window">
      <VWindowItem value="overview">
        <div class="ptm-overview">
        <div class="ptm-toolbar">
          <div class="ptm-toolbar__info">
            <span>站点数据 {{ shortTime(mpDataAt) || '—' }}</span>
            <span class="ptm-dot" />
            <span>扩展采集 {{ shortTime(extendedAt) || '未采集' }}</span>
            <span class="ptm-dot" />
            <span>页面生成 {{ shortTime(generatedAt) || '—' }}</span>
          </div>
          <div class="ptm-toolbar__actions">
            <VChip v-if="collecting" color="info" size="small" variant="tonal">
              <VProgressCircular indeterminate size="14" class="mr-2" />
              {{ collectProgressText }}
            </VChip>
            <VBtn
              size="small"
              variant="tonal"
              color="secondary"
              prepend-icon="mdi-database-sync-outline"
              :disabled="collecting"
              @click="collect()"
            >
              采集全部站点
            </VBtn>
          </div>
        </div>

        <div class="ptm-summary">
          <MetricCard
            v-for="card in summaryCards"
            :key="card.label"
            :label="card.label"
            :value="card.value"
            :hint="card.hint"
            :icon="card.icon"
            :color="card.color"
          />
        </div>

        <div class="ptm-attention">
          <button
            type="button"
            class="ptm-attention__tile"
            :class="attention.hrTotal > 0 ? 'ptm-attention__tile--alert' : 'ptm-attention__tile--ok'"
            @click="openAttention('hr')"
          >
            <VIcon
              :icon="attention.hrTotal > 0 ? 'mdi-alert-octagon' : 'mdi-check-circle-outline'"
              size="22"
            />
            <span class="ptm-attention__text">
              <span class="ptm-attention__label">H&amp;R 未完成</span>
              <span class="ptm-attention__value">{{ formatInteger(attention.hrTotal) }}</span>
              <span class="ptm-attention__hint">
                {{ attention.hrCount ? `${attention.hrCount} 个站点需要处理` : `已采集 ${attention.known} 个站点，全部正常` }}
              </span>
            </span>
            <span class="ptm-attention__more">
              查看站点
              <VIcon icon="mdi-chevron-right" size="18" />
            </span>
          </button>

          <button
            type="button"
            class="ptm-attention__tile"
            :class="{ 'ptm-attention__tile--info': attention.available > 0 }"
            @click="openAttention('invite')"
          >
            <VIcon icon="mdi-account-plus-outline" size="22" />
            <span class="ptm-attention__text">
              <span class="ptm-attention__label">邀请名额</span>
              <span class="ptm-attention__value">{{ formatInteger(attention.available) }}</span>
              <span class="ptm-attention__hint">
                已发送 {{ formatInteger(attention.sent) }} · {{ attention.inviteCount }} 个站点有名额或已发
              </span>
            </span>
            <span class="ptm-attention__more">
              查看站点
              <VIcon icon="mdi-chevron-right" size="18" />
            </span>
          </button>
        </div>

        <div class="ptm-filters">
          <VTextField
            v-model="keyword"
            density="compact"
            variant="outlined"
            hide-details
            clearable
            prepend-inner-icon="mdi-magnify"
            placeholder="搜索站点、用户名或 UID"
            class="ptm-filters__search"
          />
          <VChipGroup v-model="filter" mandatory density="comfortable" class="ptm-filters__chips">
            <VChip value="all" size="small" variant="tonal">全部</VChip>
            <VChip value="error" size="small" variant="tonal">数据异常</VChip>
            <VChip value="no_extended" size="small" variant="tonal">未采集扩展</VChip>
            <VChip value="hr" size="small" variant="tonal">有 H&amp;R</VChip>
            <VChip value="invite" size="small" variant="tonal">有名额</VChip>
            <VChip value="claims" size="small" variant="tonal">有认领</VChip>
            <VChip value="inactive" size="small" variant="tonal">未启用</VChip>
          </VChipGroup>

          <VMenu :close-on-content-click="false" location="bottom end">
            <template #activator="{ props: activatorProps }">
              <VBtn
                v-bind="activatorProps"
                size="small"
                variant="tonal"
                prepend-icon="mdi-sort"
                class="ptm-filters__action"
              >
                排序：{{ sortLabel }}
                <VIcon :icon="sortDesc ? 'mdi-arrow-down' : 'mdi-arrow-up'" size="16" class="ml-1" />
              </VBtn>
            </template>
            <VCard min-width="470" max-width="560">
              <VCardText class="ptm-sortcard">
                <div class="ptm-sortcard__head">
                  <span class="ptm-menu__title">排序字段</span>
                  <VBtnGroup density="compact" variant="tonal">
                    <VBtn size="x-small" :variant="sortDesc ? 'flat' : 'tonal'" @click="sortDesc = true">
                      降序
                    </VBtn>
                    <VBtn size="x-small" :variant="sortDesc ? 'tonal' : 'flat'" @click="sortDesc = false">
                      升序
                    </VBtn>
                  </VBtnGroup>
                </div>
                <div class="ptm-sortcard__grid">
                  <button
                    v-for="field in sortFields"
                    :key="field.key"
                    type="button"
                    class="ptm-sortcard__item"
                    :class="{ 'ptm-sortcard__item--active': sortKey === field.key }"
                    @click="chooseSort(field.key)"
                  >
                    {{ field.title }}
                    <VIcon
                      v-if="sortKey === field.key && field.key !== 'custom'"
                      :icon="sortDesc ? 'mdi-arrow-down' : 'mdi-arrow-up'"
                      size="13"
                    />
                  </button>
                </div>
                <div class="ptm-sortcard__foot">拖拽列表行首手柄可直接调整「自定义顺序」</div>
              </VCardText>
            </VCard>
          </VMenu>

          <VMenu :close-on-content-click="false" location="bottom end">
            <template #activator="{ props: activatorProps }">
              <VBtn
                v-bind="activatorProps"
                size="small"
                variant="tonal"
                prepend-icon="mdi-table-column"
                class="ptm-filters__action"
              >
                列
              </VBtn>
            </template>
            <VCard min-width="340">
              <VCardText class="ptm-colcard">
                <div class="ptm-colcard__head">
                  <span class="ptm-menu__title">显示列</span>
                  <span class="ptm-colcard__hint">用 ↑↓ 调整顺序</span>
                </div>
                <div class="ptm-colcard__rows">
                  <div
                    v-for="(column, index) in orderedAllColumns"
                    :key="column.key"
                    class="ptm-colcard__row"
                  >
                    <VCheckbox
                      v-model="visibleColumns"
                      :value="column.key"
                      :label="column.title"
                      density="compact"
                      hide-details
                    />
                    <span class="ptm-colcard__moves">
                      <button
                        type="button"
                        class="ptm-colcard__move"
                        title="上移"
                        :disabled="index === 0"
                        @click="moveColumn(index, -1)"
                      >
                        <VIcon icon="mdi-arrow-up" size="13" />
                      </button>
                      <button
                        type="button"
                        class="ptm-colcard__move"
                        title="下移"
                        :disabled="index === orderedAllColumns.length - 1"
                        @click="moveColumn(index, 1)"
                      >
                        <VIcon icon="mdi-arrow-down" size="13" />
                      </button>
                    </span>
                  </div>
                </div>
              </VCardText>
            </VCard>
          </VMenu>
        </div>

        <VCard rounded="lg" variant="outlined" class="ptm-table-card">
          <div v-if="isCardView" ref="bodyRef" class="ptm-cards">
            <VCard
              v-for="(site, index) in orderedSites"
              :key="site.domain"
              class="ptm-site-card"
              variant="tonal"
              :class="{
                'ptm-site-card--dragging': dragging && dragFrom === index,
                'ptm-site-card--drop': dragging && dragTo === index && dragFrom !== index,
              }"
              @click="openDetail(site)"
            >
              <VCardText class="ptm-site-card__body">
                <div class="ptm-site-card__head">
                  <span
                    class="ptm-site-card__handle"
                    title="按住拖动调整顺序"
                    @pointerdown="onHandleDown($event, index)"
                    @click.stop
                  >
                    <VIcon icon="mdi-drag-vertical" size="16" />
                  </span>
                  <SiteAvatar :api="api" :site="site" :size="28" />
                  <div class="ptm-site-card__title">
                    <div class="ptm-site-card__name">
                      <span class="font-weight-medium">{{ site.name }}</span>
                      <span
                        v-if="failureLabel(site)"
                        class="ptm-row__fail"
                        :title="failureDetail(site)"
                      >
                        {{ failureLabel(site) }}
                      </span>
                    </div>
                    <div class="text-caption text-medium-emphasis">{{ site.user_level || '—' }}</div>
                  </div>
                  <VChip
                    v-if="Number(site.extended?.hr) > 0"
                    color="error"
                    size="x-small"
                    variant="tonal"
                  >
                    H&amp;R {{ formatInteger(site.extended.hr) }}
                  </VChip>
                  <VChip :color="freshness(site.updated_at).color" size="x-small" variant="tonal">
                    {{ freshness(site.updated_at).label }}
                  </VChip>
                </div>
                <div class="ptm-site-card__grid">
                  <div v-for="column in cardColumns" :key="column.key">
                    <span class="ptm-site-card__label">{{ column.title }}</span>
                    <span
                      class="ptm-site-card__value"
                      :class="column.key === 'ratio' ? `ptm-tone--${ratioColor(site.ratio)}` : ''"
                    >
                      {{ cellText(site, column.key) }}
                    </span>
                  </div>
                </div>
              </VCardText>
            </VCard>
          </div>

          <div v-else class="ptm-table">
            <div class="ptm-table__head" :style="{ gridTemplateColumns: gridTemplate, ...tableStyle }">
              <div class="ptm-table__cell ptm-table__cell--site">
                站点
                <span class="ptm-table__hint">可拖拽排序</span>
              </div>
              <div
                v-for="column in activeColumns"
                :key="column.key"
                class="ptm-table__cell ptm-table__cell--sortable"
                :class="{ 'ptm-table__cell--numeric': column.numeric }"
                @click="toggleSort(column.key)"
              >
                {{ column.title }}
                <VIcon
                  v-if="sortKey === column.key"
                  size="14"
                  :icon="sortDesc ? 'mdi-arrow-down' : 'mdi-arrow-up'"
                />
              </div>
            </div>
            <div ref="bodyRef" class="ptm-table__body">
              <div
                v-for="(site, index) in orderedSites"
                :key="site.domain"
                class="ptm-row"
                :class="{
                  'ptm-row--dragging': dragging && dragFrom === index,
                  'ptm-row--drop': dragging && dragTo === index && dragFrom !== index,
                  'ptm-row--error': Boolean(failureDetail(site)),
                }"
                :style="{ gridTemplateColumns: gridTemplate, ...tableStyle }"
                @click="openDetail(site)"
              >
                <div class="ptm-row__site">
                  <span
                    class="ptm-row__handle"
                    title="按住拖动调整顺序"
                    @pointerdown="onHandleDown($event, index)"
                    @click.stop
                  >
                    <VIcon icon="mdi-drag-vertical" size="14" />
                  </span>
                  <SiteAvatar :api="api" :site="site" :size="30" />
                  <span class="ptm-row__name">{{ site.name }}</span>
                  <span class="ptm-row__domain">{{ site.domain }}</span>
                  <!-- 失败站点在名称后直接标注原因，便于一眼区分 -->
                  <span
                    v-if="failureLabel(site)"
                    class="ptm-row__fail"
                    :title="failureDetail(site)"
                  >
                    {{ failureLabel(site) }}
                  </span>
                </div>
                <div
                  v-for="column in activeColumns"
                  :key="column.key"
                  class="ptm-row__cell"
                  :class="{
                    'ptm-row__cell--numeric': column.numeric,
                    'ptm-row__cell--strong': column.strong,
                  }"
                >
                  <VChip
                    v-if="column.key === 'ratio'"
                    :color="ratioColor(site.ratio)"
                    size="x-small"
                    variant="tonal"
                  >
                    {{ cellText(site, column.key) }}
                  </VChip>
                  <VChip
                    v-else-if="column.key === 'hr' && Number(site.extended?.hr) > 0"
                    color="error"
                    size="x-small"
                    variant="tonal"
                  >
                    {{ cellText(site, column.key) }}
                  </VChip>
                  <span
                    v-else-if="column.key === 'hourly'"
                    class="ptm-hourly"
                    :title="hourlySourceText(site)"
                  >
                    {{ cellText(site, column.key) }}
                    <span
                      v-if="site.hourly_bonus_source && site.hourly_bonus_source !== 'page'"
                      class="ptm-hourly__tag"
                    >
                      {{ site.hourly_bonus_source === 'daily' ? '推算' : '估算' }}
                    </span>
                  </span>
                  <!-- 采集失败的站点，数据时间用红色标注，与正常站点区分 -->
                  <span
                    v-else-if="column.key === 'updated_at' && failureLabel(site)"
                    class="ptm-row__time ptm-row__time--fail"
                    :title="failureDetail(site)"
                  >
                    {{ cellText(site, column.key) }}
                  </span>
                  <span v-else :class="{ 'ptm-row__muted': cellText(site, column.key) === '—' }">
                    {{ cellText(site, column.key) }}
                  </span>
                </div>
              </div>
            </div>
          </div>

          <VCardText v-if="!orderedSites.length" class="text-center text-medium-emphasis">
            没有符合条件的站点
          </VCardText>
        </VCard>
        </div>
      </VWindowItem>

      <VWindowItem value="retirement">
        <RetirementPanel :retirement="retirement" :sites="sites" :api="api" :twelve="twelve" />
      </VWindowItem>

      <VWindowItem value="invite">
        <InvitePanel
          :invite="invite"
          :sites="sites"
          :api="api"
          :collecting="inviteCollecting"
          @collect="collectInvite"
        />
      </VWindowItem>

      <VWindowItem value="config">
        <SettingsForm
          :api="api"
          :plugin-id="pluginId"
          :initial-settings="initialSettings"
          :host-managed-config="hostManagedConfig"
          :show-close="showClose"
          @save="handleSave"
          @saved="onSettingsSaved"
          @close="emit('close')"
          @message="notify($event.text, $event.color)"
        />
      </VWindowItem>
    </VWindow>

    <SiteDetailDialog
      v-model="detailOpen"
      :site="activeSite"
      :api="api"
      :plugin-id="pluginId"
      :collecting="Boolean(activeSite) && collectingDomain === activeSite.domain"
      @collect="collect"
      @message="notify($event.text, $event.color)"
    />

    <AttentionDialog
      v-model="attentionOpen"
      :sites="sites"
      :initial-tab="attentionTab"
      :api="api"
      @open-site="openSiteFromAttention"
    />

    <VSnackbar v-model="snackbar.show" :color="snackbar.color" :timeout="4000" location="bottom">
      {{ snackbar.text }}
    </VSnackbar>
  </div>
</template>

<style scoped>
.ptm-root {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-width: 0;
  /* 两个主 Tab 共用的内容高度基准：一屏内放下，不留整页滚动。 */
  --ptm-tab-h: clamp(560px, calc(100vh - 120px), 1100px);
  /*
   * 兼容两种宿主布局：
   * - 宿主给插件容器固定高度时，height:100% 生效 → 插件内部滚动；
   * - 宿主不限高（百分比高度解析为 auto）时，内容自然撑开 → 整页滚动。
   * 这样无论 MoviePilot 哪个端渲染，内容都不会被裁掉且可滚动。
   */
  height: 100%;
  min-height: 0;
}

/*
 * 仅在宿主把插件容器限高（内容放不下）时才让插件自身滚动，
 * 否则保持自然高度、交给整页滚动。由 syncScrollMode() 运行时判定，
 * 避免无谓的 overflow 容器吞掉滚轮事件。
 */
.ptm-root--inner-scroll {
  overflow-y: auto;
}

.ptm-root--compact {
  padding: 0;
}

/*
 * 移动端：放弃「固定高度 + 内部滚动」。
 *
 * 手机上可视区高度有限（浏览器地址栏还会占位），固定高度会把窗口撑出屏幕，
 * 又因为窗口 overflow:hidden，下半部分既看不到也滚不动。
 * 这里改为自然高度，整页由浏览器滚动，内容全部可达。
 */
@media (max-width: 1200px) {
  .ptm-root {
    --ptm-tab-h: auto;
  }

  /* 手机屏幕小，Tab 栏不再吸顶，随页面一起滚动，避免长期占用顶部空间 */
  .ptm-tabbar {
    position: static;
  }

  .ptm-window {
    height: auto;
    overflow: visible;
  }

  .ptm-overview {
    height: auto;
  }

  .ptm-table-card {
    flex: 0 0 auto;
  }

  /* 表格交给页面纵向滚动，只保留横向滚动查看各列 */
  .ptm-table {
    flex: 0 0 auto;
    overflow-x: auto;
    overflow-y: visible;
  }

  .ptm-cards {
    flex: 0 0 auto;
    overflow-y: visible;
  }
}

/* 不做任何窗口高度锁定：保持自然文档流，整页由浏览器滚动。
   之前锁定窗口高度 + Tab 内部滚动会让插件页整体无法滚动。 */
.ptm-window {
  min-height: 0;
}

/* 总览内容容器：固定为共用高度，内部表格自适应剩余空间。 */
.ptm-overview {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: var(--ptm-tab-h);
  min-width: 0;
  min-height: 0;
  /* 与下方站点卡片区一致的左右留白，避免合计卡与搜索栏紧贴边框。 */
  padding: 0 10px;
}

.ptm-tabs {
  flex: 1 1 auto;
  min-width: 0;
}

/* Tab 行：标签靠左，关闭按钮固定在右上并与之同高。 */
.ptm-tabbar {
  align-items: center;
  background: rgb(var(--v-theme-surface));
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  display: flex;
  gap: 8px;
  position: sticky;
  top: 0;
  width: 100%;
  z-index: 6;
}

.ptm-tabbar__close {
  flex: 0 0 auto;
  margin-right: 6px;
}

/* 关闭按钮与右边缘留出间距，并垂直居中于 Tab 行。 */
.ptm-tabs__close {
  align-self: center;
  margin-right: 10px;
}

.ptm-toolbar {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  justify-content: space-between;
  margin-bottom: 10px;
}

.ptm-toolbar__info {
  align-items: center;
  color: rgba(var(--v-theme-on-surface), 0.65);
  display: flex;
  flex-wrap: wrap;
  font-size: 0.74rem;
  gap: 8px;
}

.ptm-dot {
  background: currentColor;
  border-radius: 50%;
  height: 3px;
  opacity: 0.5;
  width: 3px;
}

.ptm-toolbar__actions {
  display: flex;
  gap: 8px;
}

.ptm-summary {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.ptm-attention {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.ptm-attention__tile {
  align-items: center;
  background: rgba(var(--v-theme-on-surface), 0.04);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 12px;
  cursor: pointer;
  display: grid;
  gap: 12px;
  grid-template-columns: 24px minmax(0, 1fr) auto;
  padding: 8px 12px;
  text-align: left;
  transition: background 0.15s ease, border-color 0.15s ease, transform 0.15s ease;
  width: 100%;
}

.ptm-attention__tile:hover {
  background: rgba(var(--v-theme-primary), 0.1);
  border-color: rgba(var(--v-theme-primary), 0.45);
}

.ptm-attention__tile--alert {
  background: rgba(var(--v-theme-error), 0.12);
  border-color: rgba(var(--v-theme-error), 0.45);
  color: rgb(var(--v-theme-error));
}

.ptm-attention__tile--info {
  color: rgb(var(--v-theme-primary));
}

/* H&R 全部正常时用成功色，避免和「无数据」的灰色混在一起。 */
.ptm-attention__tile--ok {
  background: rgba(var(--v-theme-success), 0.1);
  border-color: rgba(var(--v-theme-success), 0.38);
  color: rgb(var(--v-theme-success));
}

.ptm-attention__text {
  display: grid;
  gap: 1px 10px;
  grid-template-columns: auto auto;
  min-width: 0;
}

.ptm-attention__label {
  font-size: 0.74rem;
  font-weight: 600;
  opacity: 0.85;
}

.ptm-attention__value {
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  grid-row: span 2;
  text-align: right;
}

.ptm-attention__hint {
  font-size: 0.7rem;
  opacity: 0.72;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ptm-attention__more {
  align-items: center;
  display: flex;
  font-size: 0.72rem;
  gap: 2px;
  opacity: 0.8;
  white-space: nowrap;
}

.ptm-filters {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin: 4px 0 2px;
}

.ptm-filters__search {
  max-width: 300px;
}

.ptm-filters__chips {
  flex: 1 1 auto;
  min-width: 0;
}

.ptm-menu__title {
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.04em;
  opacity: 0.6;
  text-transform: uppercase;
}

.ptm-sortcard {
  max-height: min(70vh, 520px);
  overflow-y: auto;
  overscroll-behavior: auto;
  padding: 10px 12px;
}

.ptm-sortcard__head {
  align-items: center;
  display: flex;
  justify-content: space-between;
  margin-bottom: 8px;
}

.ptm-sortcard__grid {
  display: grid;
  gap: 4px;
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.ptm-sortcard__item {
  align-items: center;
  background: rgba(var(--v-theme-on-surface), 0.05);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  font-size: 0.73rem;
  gap: 3px;
  justify-content: center;
  padding: 5px 4px;
  white-space: nowrap;
}

.ptm-sortcard__item:hover {
  background: rgba(var(--v-theme-primary), 0.14);
}

.ptm-sortcard__item--active {
  background: rgba(var(--v-theme-primary), 0.22);
  border-color: rgba(var(--v-theme-primary), 0.6);
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

.ptm-sortcard__foot {
  font-size: 0.68rem;
  margin-top: 8px;
  opacity: 0.6;
}

.ptm-colcard {
  max-height: min(70vh, 520px);
  overflow-y: auto;
  overscroll-behavior: auto;
  padding: 8px 12px;
}

.ptm-colcard__head {
  align-items: baseline;
  display: flex;
  gap: 8px;
  justify-content: space-between;
}

.ptm-colcard__hint {
  color: rgba(var(--v-theme-on-surface), 0.45);
  font-size: 0.64rem;
}

/* 每列一行：勾选框 + 上下移动按钮，支持自定义顺序。 */
.ptm-colcard__rows {
  display: flex;
  flex-direction: column;
  margin-top: 2px;
}

.ptm-colcard__row {
  align-items: center;
  border-radius: 6px;
  display: flex;
  gap: 4px;
  justify-content: space-between;
  padding: 0 2px;
}

.ptm-colcard__row:hover {
  background: rgba(var(--v-theme-on-surface), 0.05);
}

.ptm-colcard__moves {
  display: flex;
  flex: 0 0 auto;
  gap: 2px;
}

.ptm-colcard__move {
  align-items: center;
  background: transparent;
  border: 1px solid rgba(var(--v-theme-on-surface), 0.16);
  border-radius: 5px;
  color: rgba(var(--v-theme-on-surface), 0.7);
  cursor: pointer;
  display: flex;
  height: 20px;
  justify-content: center;
  padding: 0;
  width: 20px;
}

.ptm-colcard__move:hover:not(:disabled) {
  background: rgba(var(--v-theme-primary), 0.16);
  border-color: rgba(var(--v-theme-primary), 0.5);
  color: rgb(var(--v-theme-primary));
}

.ptm-colcard__move:disabled {
  cursor: default;
  opacity: 0.3;
}

.ptm-table-card {
  overflow: hidden;
}

/* 与养老进度面板等高并让表格区独立滚动，切换 Tab 时高度不再跳动。 */
.ptm-table-card {
  display: flex;
  flex-direction: column;
  /* 吃掉总览容器的剩余高度，表格内部滚动，不带动整页。 */
  flex: 1 1 auto;
  min-height: 0;
}

.ptm-table__body {
  display: flex;
  flex-direction: column;
  /* 横向与纵向滚动统一交给 .ptm-table，避免表头与行各自滚动导致错位。 */
  min-width: 0;
}

.ptm-table {
  display: flex;
  flex-direction: column;
}

.ptm-table {
  flex: 1 1 auto;
  min-height: 0;
}

/* 列多时表格整体横向滚动；行宽由组件按列下限之和注入，保证能滚到最后一列。 */
.ptm-table {
  /* 单一滚动容器：表头 sticky 才能与行保持横向同步。 */
  overflow: auto;
  overscroll-behavior: auto;
  scrollbar-gutter: stable;
}

.ptm-table__head {
  align-items: center;
  background: color-mix(
    in srgb,
    rgb(var(--v-theme-surface)) 90%,
    rgb(var(--v-theme-on-surface))
  );
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  display: grid;
  font-size: 0.73rem;
  font-weight: 600;
  gap: 8px;
  letter-spacing: 0.02em;
  padding: 10px 12px;
  position: sticky;
  top: 0;
  /* 必须高于行的冻结站点列（z-index 2），否则纵向滚动时行会盖住表头。 */
  z-index: 5;
}

.ptm-table__body {
  display: flex;
  flex-direction: column;
}

.ptm-table__cell {
  align-items: center;
  display: flex;
  gap: 4px;
  min-width: 0;
  /* 不用 opacity 做淡化：它会让冻结列的背景一起变透明，造成内容穿透。 */
  color: rgba(var(--v-theme-on-surface), 0.85);
}

.ptm-table__cell--numeric {
  justify-content: flex-end;
}

.ptm-table__cell--sortable {
  cursor: pointer;
  user-select: none;
}

.ptm-table__cell--sortable:hover {
  color: rgb(var(--v-theme-primary));
}

.ptm-table__cell--site {
  gap: 8px;
}

/* 冻结站点列：横向滚动时站点名始终可见，左侧不再「滚丢」。 */
.ptm-table__cell--site,
.ptm-row__site {
  /* 用负边距抵消行的左右内边距，滚动时真正贴住左边缘；
     背景取行的实色变量，避免半透明导致内容穿透。 */
  background: var(--ptm-row-bg, rgb(var(--v-theme-surface)));
  left: 0;
  margin-left: -12px;
  padding-left: 12px;
  position: sticky;
  z-index: 2;
}

/* 表头自身不是 .ptm-row，单独给出不透明底色。 */
.ptm-table__head .ptm-table__cell--site {
  background: color-mix(
    in srgb,
    rgb(var(--v-theme-surface)) 90%,
    rgb(var(--v-theme-on-surface))
  );
  /* 表头内的冻结列要压在表头其它列与所有行之上。 */
  z-index: 6;
}

/* 冻结列右边界加一条分隔线，明确与滚动区的关系。 */
.ptm-table__cell--site::after,
.ptm-row__site::after {
  background: rgba(var(--v-theme-on-surface), 0.08);
  bottom: 0;
  content: '';
  position: absolute;
  right: -4px;
  top: 0;
  width: 1px;
}

.ptm-table__hint {
  font-size: 0.64rem;
  font-weight: 400;
  opacity: 0.55;
}

.ptm-row {
  align-items: center;
  /* 实色底：冻结站点列用 inherit 才能完全遮住滚动过的内容。 */
  --ptm-row-bg: rgb(var(--v-theme-surface));
  background: var(--ptm-row-bg);
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.07);
  cursor: pointer;
  display: grid;
  gap: 8px;
  padding: 9px 12px;
  position: relative;
  transition: background 0.12s ease;
}

.ptm-row:nth-child(even) {
  --ptm-row-bg: color-mix(
    in srgb,
    rgb(var(--v-theme-surface)) 96%,
    rgb(var(--v-theme-on-surface))
  );
  background: var(--ptm-row-bg);
}

.ptm-row:last-child {
  border-bottom: none;
}

.ptm-row:hover {
  --ptm-row-bg: color-mix(
    in srgb,
    rgb(var(--v-theme-surface)) 88%,
    rgb(var(--v-theme-primary))
  );
  background: var(--ptm-row-bg);
}

.ptm-row--dragging {
  opacity: 0.45;
}

.ptm-row--drop::before {
  background: rgb(var(--v-theme-primary));
  content: '';
  height: 2px;
  left: 8px;
  position: absolute;
  right: 8px;
  top: -1px;
}

.ptm-row--error {
  box-shadow: inset 3px 0 0 rgb(var(--v-theme-error));
}

/* 站点名后的失败标注：短标签、单行、不撑破列宽 */
.ptm-row__fail {
  background: rgba(var(--v-theme-error), 0.16);
  flex: 0 0 auto;
  border: 1px solid rgba(var(--v-theme-error), 0.42);
  border-radius: 4px;
  color: rgb(var(--v-theme-error));
  font-size: 0.62rem;
  font-weight: 600;
  line-height: 1.35;
  max-width: none;
  overflow: hidden;
  padding: 0 5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 失败站点的数据时间用红色标出 */
.ptm-row__time--fail {
  color: rgb(var(--v-theme-error));
}

.ptm-row__site {
  align-items: center;
  display: flex;
  gap: 6px;
  min-width: 0;
  overflow: hidden;
}

.ptm-row__handle {
  align-items: center;
  color: rgba(var(--v-theme-on-surface), 0.4);
  cursor: grab;
  display: flex;
  opacity: 0.35;
  padding: 2px 0;
  touch-action: pan-y;
  transition: opacity 0.12s ease;
}

.ptm-row:hover .ptm-row__handle {
  opacity: 1;
}

.ptm-row__handle:active {
  cursor: grabbing;
}

.ptm-row__name {
  flex: 0 1 auto;
  font-size: 0.88rem;
  font-weight: 600;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ptm-row__domain {
  color: rgba(var(--v-theme-on-surface), 0.6);
  /* 空间不足时优先压缩域名，保证站点名与失败标签完整 */
  flex: 1 1 40px;
  font-size: 0.7rem;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ptm-row__cell {
  align-items: center;
  display: flex;
  font-size: 0.82rem;
  font-variant-numeric: tabular-nums;
  justify-content: flex-start;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ptm-row__cell--numeric {
  justify-content: flex-end;
}

.ptm-row__cell--strong {
  font-weight: 600;
}

.ptm-row__muted {
  opacity: 0.45;
}

.ptm-hourly {
  align-items: center;
  display: inline-flex;
  gap: 4px;
}

.ptm-hourly__tag {
  border: 1px solid currentColor;
  border-radius: 4px;
  font-size: 0.58rem;
  line-height: 1.3;
  opacity: 0.55;
  padding: 0 3px;
}

.ptm-cards {
  display: grid;
  gap: 10px;
  /* 一排 3~4 个，窄屏自动降列 */
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  /* 左右留白由 .ptm-overview 统一提供，这里只补上下间距，保证与上方区块对齐。 */
  padding: 0 0 10px;
}

@media (min-width: 1500px) {
  .ptm-cards {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }
}

@media (min-width: 1100px) and (max-width: 1499px) {
  .ptm-cards {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.ptm-cards {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: auto;
}

/* 关键：grid 在 flex 子项里默认会被压缩行高，显式声明按内容排列并允许滚动。 */
.ptm-cards {
  align-content: start;
  grid-auto-rows: min-content;
}

.ptm-site-card__body {
  padding: 10px 12px;
}

.ptm-site-card__head {
  align-items: center;
  display: flex;
  gap: 10px;
}

/* 卡片上的拖拽手柄：默认淡显，悬停时增强，与列表模式行为一致。 */
.ptm-site-card__handle {
  align-items: center;
  color: rgba(var(--v-theme-on-surface), 0.34);
  cursor: grab;
  display: flex;
  flex: 0 0 auto;
  margin-left: -4px;
}

.ptm-site-card:hover .ptm-site-card__handle {
  color: rgba(var(--v-theme-on-surface), 0.72);
}

.ptm-site-card__handle:active {
  cursor: grabbing;
}

.ptm-site-card--dragging {
  opacity: 0.5;
}

.ptm-site-card--drop {
  outline: 2px dashed rgb(var(--v-theme-primary));
  outline-offset: 2px;
}

.ptm-site-card__title {
  flex: 1 1 auto;
  min-width: 0;
}

.ptm-site-card__name {
  align-items: center;
  display: flex;
  gap: 5px;
  min-width: 0;
}

.ptm-site-card__name > .font-weight-medium {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ptm-site-card__grid {
  display: grid;
  gap: 5px 12px;
  /* 一排 3 个字段，勾选更多列时自动往下换行扩展。 */
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-top: 8px;
}

.ptm-site-card__label {
  display: block;
  font-size: 0.66rem;
  opacity: 0.7;
}

.ptm-site-card__value {
  font-size: 0.8rem;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  overflow-wrap: anywhere;
}

.ptm-tone--success {
  color: rgb(var(--v-theme-success));
}

.ptm-tone--primary {
  color: rgb(var(--v-theme-primary));
}

.ptm-tone--warning {
  color: rgb(var(--v-theme-warning));
}

.ptm-tone--error {
  color: rgb(var(--v-theme-error));
}

.ptm-tone--grey {
  opacity: 0.6;
}

@media (max-width: 1100px) {
  .ptm-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .ptm-attention {
    grid-template-columns: minmax(0, 1fr);
  }

  .ptm-sortcard__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .ptm-colcard__grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 720px) {
  .ptm-summary {
    grid-template-columns: minmax(0, 1fr);
  }

  .ptm-filters__search {
    max-width: none;
    width: 100%;
  }

  .ptm-filters__action {
    flex: 1 1 auto;
  }
}
</style>
