<script setup>
/**
 * 养老进度面板。
 *
 * 布局与信息组织对齐 PT数据统计的养老进度：
 * 左侧站点列表（可排序、独立滚动、可拖拽翻页）＋右侧站点明细
 * （头部标识与关键流量 → 等级进度轨道 → 目标等级要求表 → 完整等级路线表）。
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import SiteAvatar from './SiteAvatar.vue'
import { formatBytes, formatNumber } from '../utils'

const props = defineProps({
  retirement: { type: Object, default: () => ({ sites: [] }) },
  sites: { type: Array, default: () => [] },
  api: { type: Object, default: () => ({}) },
  twelve: { type: Object, default: () => ({ joined: 0, total: 12, percent: 0, items: [] }) },
})

/** 十二大节点数据与汇总。 */
const twelveItems = computed(() => props.twelve?.items || [])
const twelveJoinedCount = computed(() => Number(props.twelve?.joined || 0))
const twelveTotalCount = computed(() => Number(props.twelve?.total || 12))
const twelvePercent = computed(() => Number(props.twelve?.percent || 0))
const twelveRemainingCount = computed(() =>
  Math.max(twelveTotalCount.value - twelveJoinedCount.value, 0),
)

/** 时间线填充长度：首节点为 0%，末节点为 100%。 */
const twelveTrackPercent = computed(() => {
  if (twelveTotalCount.value <= 1 || twelveJoinedCount.value <= 1) return 0
  return Math.min(100, ((twelveJoinedCount.value - 1) * 100) / (twelveTotalCount.value - 1))
})

/** 十二大节点状态文案。 */
function twelveStateMeta(state) {
  if (state === 'joined') return { label: '已加入', icon: 'mdi-check-circle' }
  if (state === 'waiting') return { label: '已配置站点但暂无数据', icon: 'mdi-clock-outline' }
  return { label: '未加入', icon: 'mdi-lock-outline' }
}

/** 加入日期只展示「YYYY-MM-DD」，缺失时给出占位。 */
function twelveJoinDate(joinAt) {
  const text = String(joinAt || '').trim()
  if (!text) return '加入日期未知'
  const matched = text.match(/^(\d{4})-(\d{2})-(\d{2})/)
  return matched ? `${matched[1]}-${matched[2]}-${matched[3]}` : text.slice(0, 10)
}

const retirementSortKey = ref('site_priority')
const retirementSortOptions = [
  { title: '站点优先级', value: 'site_priority' },
  { title: '站点名称', value: 'site_name' },
  { title: '养老进度', value: 'retirement_progress' },
  { title: '剩余等级', value: 'levels_remaining' },
]

/** 顶部状态标签筛选，all 表示不筛选。 */
const statusFilter = ref('all')
const STATUS_FILTERS = [
  { key: 'all', label: '全部', color: 'primary' },
  { key: 'rule_missing', label: '规则缺失', color: 'secondary' },
  { key: 'upgrading', label: '升级中', color: 'warning' },
  { key: 'retired', label: '养老中', color: 'success' },
  { key: 'wealthy_retired', label: '富贵养老', color: 'warning' },
]

function statusCount(key) {
  if (key === 'all') return (retirement.value.sites || []).length
  if (key === 'wealthy_retired') return wealthyRetiredCount.value
  if (key === 'retired') return ordinaryRetiredCount.value
  return Number(retirement.value[key] || 0)
}

/** 点击状态标签：切换筛选，再次点击取消。 */
function toggleStatusFilter(key) {
  statusFilter.value = statusFilter.value === key ? 'all' : key
}

const selectedRetirementSiteKey = ref('')
const selectedRouteLevelName = ref('')

const retirement = computed(() => props.retirement || { sites: [] })
const wealthyRetiredCount = computed(() =>
  retirement.value.wealthy_retired
  ?? (retirement.value.sites || []).filter(site => site.status === 'wealthy_retired').length,
)
const ordinaryRetiredCount = computed(() => Number(retirement.value.retired || 0))

/** 站点记录里查头像用的原始站点信息（含 site_id 与域名）。 */
const siteInfoByDomain = computed(() => {
  const map = {}
  for (const site of props.sites || []) {
    map[site.domain] = site
  }
  return map
})

function avatarSite(site) {
  return siteInfoByDomain.value[site?.domain] || { domain: site?.domain, name: site?.site_name }
}

function retirementSiteKey(site) {
  return String(site?.site_id || site?.domain || site?.site_name || '')
}

function field(value, digits = 2) {
  if (value === null || value === undefined || value === '') return '—'
  const number = Number(value)
  return Number.isFinite(number) ? formatNumber(number, digits) : String(value)
}

function compareSites(left, right, key) {
  const leftValue = left?.[key]
  const rightValue = right?.[key]
  const leftEmpty = leftValue === null || leftValue === undefined || leftValue === ''
  const rightEmpty = rightValue === null || rightValue === undefined || rightValue === ''
  if (leftEmpty && rightEmpty) return String(left?.site_name || '').localeCompare(String(right?.site_name || ''), 'zh')
  if (leftEmpty) return 1
  if (rightEmpty) return -1
  if (typeof leftValue === 'number' && typeof rightValue === 'number') return leftValue - rightValue
  return String(leftValue).localeCompare(String(rightValue), 'zh')
}

const filteredRetirementSites = computed(() => {
  const sites = retirement.value.sites || []
  if (statusFilter.value === 'all') return sites
  return sites.filter(site => site.status === statusFilter.value)
})

const sortedRetirementSites = computed(() => [...filteredRetirementSites.value].sort((left, right) => {
  if (retirementSortKey.value === 'retirement_progress') {
    return nextLevelOverallProgress(right) - nextLevelOverallProgress(left)
  }
  return compareSites(left, right, retirementSortKey.value)
}))

const selectedRetirementSite = computed(() =>
  sortedRetirementSites.value.find(site => retirementSiteKey(site) === selectedRetirementSiteKey.value)
  || sortedRetirementSites.value[0]
  || null,
)

/** 列表标题随筛选变化，筛选结果为空时给出明确提示。 */
const listHeadingText = computed(() => {
  const total = (retirement.value.sites || []).length
  const shown = sortedRetirementSites.value.length
  if (statusFilter.value === 'all') return `共 ${total} 个站点`
  const label = STATUS_FILTERS.find(item => item.key === statusFilter.value)?.label || ''
  return `${label} ${shown} / ${total}`
})

/** 当前筛选标签文案，供空态提示复用。 */
const currentFilterLabel = computed(
  () => STATUS_FILTERS.find(item => item.key === statusFilter.value)?.label || '全部',
)

function retirementMeta(status, site = null) {
  if (status === 'wealthy_retired') return { label: '富贵养老', color: 'warning', icon: 'mdi-crown' }
  if (status === 'retired') return { label: '已养老', color: 'success', icon: 'mdi-shield-check-outline' }
  if (status === 'upgrading' && site && !site.retirement_level && !site.next_level) return { label: '最高等级', color: 'primary', icon: 'mdi-medal-outline' }
  if (status === 'upgrading') return { label: '升级中', color: 'warning', icon: 'mdi-trending-up' }
  return { label: '规则缺失', color: 'secondary', icon: 'mdi-help-circle-outline' }
}

// ---------------------------------------------------------------------------
// 等级进度与要求计算
// ---------------------------------------------------------------------------

function nextLevelRule(site) {
  return (site.route || []).find(level => level.name === site.next_level) || null
}

function retirementRoute(site) {
  const route = site.route || []
  const userIndex = route.findIndex(level => String(level.name || '').replace(/[^a-z0-9]/gi, '').toLowerCase() === 'user')
  return userIndex >= 0 ? route.slice(userIndex) : route
}

function nextLevelOverallProgress(site) {
  if (site?.status === 'wealthy_retired') return 100
  const nextLevel = nextLevelRule(site)
  if (!nextLevel) return site?.status === 'retired' || !site?.retirement_level ? 100 : 0
  return averageRequirementProgress(requirementRows(site, nextLevel))
}

function routeNodeStatus(site, level) {
  if (level.is_current) return '当前'
  if (level.name === site?.next_level) return '下一等级'
  if (level.is_retirement) return level.reached ? '已保号' : '保号目标'
  return level.reached ? '已达成' : '待达成'
}

function splitLevelName(level) {
  const name = String(level?.name || level || '').trim()
  const aliases = Array.isArray(level?.aliases) ? level.aliases.map(value => String(value || '').trim()).filter(Boolean) : []
  const combined = [name, ...aliases]
    .map(value => value.match(/^(.+?[\u3400-\u9fff])\s*(?:[（(]([A-Za-z][A-Za-z0-9 .&+/_-]*)[）)]|([A-Za-z][A-Za-z0-9 .&+/_-]*))$/))
    .find(Boolean)
  if (combined) return { local: combined[1].trim(), english: String(combined[2] || combined[3]).trim() }
  const hasChinese = value => /[\u3400-\u9fff]/.test(value)
  const hasEnglish = value => /[A-Za-z]/.test(value)
  const chinese = [name, ...aliases].find(hasChinese) || ''
  const english = [name, ...aliases].find(value => hasEnglish(value) && !hasChinese(value)) || ''
  if (chinese) return { local: chinese, english }
  return { local: name, english: '' }
}

function durationLabel(days) {
  const value = Number(days || 0)
  if (!value) return '无限制'
  return value % 7 === 0 ? `${value / 7} 周` : `${value} 天`
}

function serverDateFor(site) {
  return String(site?.updated_day || '').slice(0, 10) || new Date().toISOString().slice(0, 10)
}

function elapsedAccountDays(site) {
  const startText = String(site?.join_at || '').slice(0, 10)
  const endText = serverDateFor(site)
  if (!startText || !endText) return null
  const start = Date.parse(`${startText}T00:00:00Z`)
  const end = Date.parse(`${endText}T00:00:00Z`)
  if (!Number.isFinite(start) || !Number.isFinite(end)) return null
  return Math.max(0, Math.floor((end - start) / 86400000))
}

function joinTimeRow(level, key) {
  if (!Number(level?.min_join_days)) return null
  const days = elapsedAccountDays(selectedRetirementSite.value)
  const target = Number(level.min_join_days)
  const strict = Boolean(level.min_join_days_strict)
  const complete = days === null ? false : (strict ? days > target : days >= target)
  const progress = days === null ? 0 : Math.max(0, Math.min(99, days * 100 / target))
  return {
    key,
    label: '注册时间',
    icon: 'mdi-calendar-clock-outline',
    current: days === null ? '数据未提供' : `${days} 天`,
    target: `${strict ? '>' : '≥'} ${durationLabel(target)}`,
    detail: complete ? '已达成' : days === null ? '数据未提供' : `剩余 ${target - days} 天`,
    eta: level.eligible_date || '—',
    complete,
    unavailable: days === null,
    progress,
  }
}

function pushUnsupported(items, prefix) {
  return (items || []).map((item, index) => ({
    key: `${prefix}-unsupported-${index}`,
    label: item?.label || '其他要求',
    icon: 'mdi-help-circle-outline',
    current: '站点未提供',
    target: String(item?.target ?? '需人工确认'),
    detail: '站点未提供该指标',
    eta: '—',
    complete: false,
    unavailable: true,
    progress: 0,
  }))
}

function requirementRows(site, level) {
  if (!level) return []
  const rows = []
  const reached = Boolean(level.reached)

  const pushNumeric = ({ key, label, icon, current, target, formatter, strict, unavailable = false, etaDate = '' }) => {
    if (!(Number(target) > 0)) return
    const currentNumber = Number(current)
    const available = current !== null && current !== undefined && Number.isFinite(currentNumber) && !unavailable
    const isStrict = Boolean(strict)
    const complete = reached || (available && (isStrict ? currentNumber > target : currentNumber >= target))
    const progress = complete ? 100 : available ? Math.max(0, Math.min(99, currentNumber * 100 / target)) : 0
    const difference = available ? Math.max(target - currentNumber, 0) : null
    rows.push({
      key,
      label,
      icon,
      current: available ? formatter(currentNumber) : '站点未提供',
      target: `${isStrict ? '>' : '≥'} ${formatter(target)}`,
      detail: complete
        ? '已达成'
        : difference === null
          ? '站点未提供该指标'
          : isStrict && difference === 0
            ? `需大于 ${formatter(target)}`
            : `剩余 ${formatter(difference)}`,
      eta: etaDate || '—',
      complete,
      unavailable: !available,
      progress,
    })
  }

  pushNumeric({ key: 'upload', label: '上传量', icon: 'mdi-upload-outline', current: site.upload, target: level.min_upload, formatter: formatBytes, strict: level.min_upload_strict })
  pushNumeric({ key: 'download', label: '下载量', icon: 'mdi-download-outline', current: site.download, target: level.min_download, formatter: formatBytes, strict: level.min_download_strict })
  pushNumeric({ key: 'ratio', label: '分享率', icon: 'mdi-chart-donut', current: site.ratio, target: level.min_ratio, formatter: value => formatNumber(value, 2), strict: level.min_ratio_strict })
  pushNumeric({ key: 'seeding-points', label: '做种积分', icon: 'mdi-star-circle-outline', current: site.seeding_points, target: level.min_seeding_points, formatter: value => formatNumber(value, 0), strict: level.min_seeding_points_strict, unavailable: site.seeding_points === null || site.seeding_points === undefined, etaDate: level.seeding_points_eta_date })
  const joinRow = joinTimeRow(level, 'join-time')
  if (joinRow) rows.push(joinRow)
  pushNumeric({ key: 'bonus', label: '魔力', icon: 'mdi-lightning-bolt-circle', current: site.bonus, target: level.min_bonus, formatter: value => formatNumber(value, 0), strict: level.min_bonus_strict, unavailable: site.bonus === null || site.bonus === undefined })
  pushNumeric({ key: 'seeding', label: '做种数', icon: 'mdi-seed-outline', current: site.seeding, target: level.min_seeding, formatter: value => formatNumber(value, 0), strict: level.min_seeding_strict })
  pushNumeric({ key: 'seeding-size', label: '做种体积', icon: 'mdi-database-outline', current: site.seeding_size, target: level.min_seeding_size, formatter: formatBytes, strict: level.min_seeding_size_strict })
  pushNumeric({ key: 'torrent-uploads', label: '发布数', icon: 'mdi-cloud-upload-outline', current: site.torrent_uploads, target: level.min_torrent_uploads, formatter: value => formatNumber(value, 0), strict: level.min_torrent_uploads_strict, unavailable: site.torrent_uploads === null || site.torrent_uploads === undefined })
  pushNumeric({ key: 'average-seeding-time', label: '平均做种时间', icon: 'mdi-timer-sand', current: site.average_seeding_time_days, target: level.min_average_seeding_time_days, formatter: value => `${formatNumber(value, 1)} 天`, strict: level.min_average_seeding_time_days_strict, unavailable: site.average_seeding_time_days === null || site.average_seeding_time_days === undefined })
  rows.push(...pushUnsupported(level.unsupported_requirements, 'requirement'))

  // 任选条件：站点把升级条件写成「满足以下任一任务即可」
  const alternativeRows = (level.alternatives || []).map((option, optionIndex) => {
    const conditions = [
      ['min_upload', '上传', site.upload, formatBytes],
      ['min_download', '下载', site.download, formatBytes],
      ['min_ratio', '分享率', site.ratio, value => formatNumber(value, 2)],
      ['min_bonus', '魔力', site.bonus, value => formatNumber(value, 0)],
      ['min_seeding_points', '做种积分', site.seeding_points, value => formatNumber(value, 0)],
      ['min_seeding', '做种数', site.seeding, value => formatNumber(value, 0)],
      ['min_seeding_size', '做种体积', site.seeding_size, formatBytes],
      ['min_torrent_uploads', '发布数', site.torrent_uploads, value => formatNumber(value, 0)],
      ['min_average_seeding_time_days', '平均做种时间', site.average_seeding_time_days, value => `${formatNumber(value, 1)} 天`],
    ].filter(([key]) => Number(option?.[key]) > 0).map(([key, label, current, formatter]) => {
      const target = Number(option[key])
      const currentNumber = Number(current)
      const available = current !== null && current !== undefined && Number.isFinite(currentNumber)
      const strict = Boolean(option[`${key}_strict`])
      const complete = available && (strict ? currentNumber > target : currentNumber >= target)
      return {
        target: `${label} ${strict ? '>' : '≥'} ${formatter(target)}`,
        current: available ? `${label} ${formatter(currentNumber)}` : `${label}数据未提供`,
        complete,
        progress: complete ? 100 : available ? Math.max(0, Math.min(99, currentNumber * 100 / target)) : 0,
      }
    })
    for (const requirement of option?.unsupported_requirements || []) {
      conditions.push({ target: `${requirement.label || '其他要求'} ${requirement.target ?? ''}`.trim(), current: `${requirement.label || '其他要求'}数据未提供`, complete: false, progress: 0 })
    }
    return {
      key: `alternative-${optionIndex}`,
      target: conditions.map(item => item.target).join(' 且 '),
      current: conditions.map(item => item.current).join('、'),
      complete: conditions.length > 0 && conditions.every(item => item.complete),
      progress: conditions.length ? conditions.reduce((sum, item) => sum + item.progress, 0) / conditions.length : 0,
    }
  }).filter(option => option.target)

  if (alternativeRows.length) {
    const complete = reached || alternativeRows.some(option => option.complete)
    rows.push({
      key: 'alternatives',
      label: '任选条件',
      icon: 'mdi-call-split',
      current: complete ? '达成' : alternativeRows.map(option => option.current).join(' 或 '),
      target: alternativeRows.map(option => option.target).join(' 或 '),
      detail: complete ? '已达成' : '满足任一条件即可',
      eta: '—',
      complete,
      unavailable: !alternativeRows.some(option => option.current && !option.current.includes('站点未提供')),
      progress: complete ? 100 : Math.max(...alternativeRows.map(option => option.progress)),
    })
  }
  return rows
}

function averageRequirementProgress(requirements) {
  if (!requirements.length || requirements.every(row => row.complete)) return 100
  // 站点未提供数据的项（如部分站点没有做种积分）不参与平均：
  // 否则它永远记为 0%，会把整条升级进度压低，看起来像「无法判断等级」。
  const measurable = requirements.filter(row => !row.unavailable)
  if (!measurable.length) return 0
  if (measurable.every(row => row.complete)) return 100
  const progress = Math.round(
    measurable.reduce((sum, row) => sum + Number(row.progress || 0), 0) / measurable.length,
  )
  return Math.min(99, progress)
}

function nextLevelEta(site, requirements) {
  const serverDate = serverDateFor(site)
  if (!serverDate) return { label: '预计时间待补充', days: null }
  const candidates = (requirements || [])
    .map(row => row.eta)
    .filter(value => value && value !== '—')
    .sort()
  if (!candidates.length) return { label: '预计时间待补充', days: null }
  const targetDate = candidates[candidates.length - 1]
  const start = Date.parse(`${serverDate}T00:00:00Z`)
  const end = Date.parse(`${targetDate}T00:00:00Z`)
  const days = Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, Math.ceil((end - start) / 86400000)) : null
  return { label: `预计达成 ${targetDate}`, days }
}

const selectedRetirementView = computed(() => {
  const site = selectedRetirementSite.value
  if (!site) return null

  const route = retirementRoute(site)
  const levels = site.route || []
  const nextLevel = nextLevelRule(site)
  const displayedLevel = route.find(level => level.name === selectedRouteLevelName.value) || nextLevel
  const requirements = requirementRows(site, displayedLevel)
  const overallProgress = averageRequirementProgress(requirements)
  const completedCount = requirements.filter(row => row.complete).length
  // 站点未提供指标的行单列出来，不计入「待完成」，避免看着像永远升不上去
  const unknownCount = requirements.filter(row => row.unavailable && !row.complete).length
  const routeCount = route.length
  const currentRouteIndex = route.findIndex(level => level.is_current)
  const completedRouteSegments = currentRouteIndex >= 0
    ? Math.min(currentRouteIndex, Math.max(routeCount - 1, 0))
    : site.status === 'retired' ? Math.max(routeCount - 1, 0) : 0

  return {
    route,
    levels,
    routeStyle: routeCount ? {
      '--route-count': routeCount,
      '--route-inset': `${50 / routeCount}%`,
      '--route-span': `${100 - 100 / routeCount}%`,
    } : {},
    routeProgress: routeCount <= 1
      ? 100
      : Math.min(100, (completedRouteSegments + nextLevelOverallProgress(site) / 100) * 100 / (routeCount - 1)),
    displayedLevel,
    isDefaultLevel: displayedLevel?.name === nextLevel?.name,
    requirements,
    overallProgress,
    completedCount,
    unknownCount,
    pendingCount: requirements.length - completedCount - unknownCount,
    eta: displayedLevel?.reached ? { label: '已达成', days: null } : nextLevelEta(site, requirements),
  }
})

// ---------------------------------------------------------------------------
// 等级路线表
// ---------------------------------------------------------------------------

function levelTrafficRequirements(level) {
  const requirements = []
  if (level.min_upload) requirements.push(`上传 ${level.min_upload_strict ? '>' : '≥'} ${formatBytes(level.min_upload)}`)
  if (level.min_download) requirements.push(`下载 ${level.min_download_strict ? '>' : '≥'} ${formatBytes(level.min_download)}`)
  return requirements.length ? requirements : ['—']
}

function levelRatioRequirement(level) {
  if (level.min_ratio === null || level.min_ratio === undefined) return '—'
  return `分享率 ${level.min_ratio_strict ? '>' : '≥'} ${formatNumber(level.min_ratio, 2)}`
}

function levelPointsRequirement(level) {
  if (level.min_seeding_points) return `做种积分 ${level.min_seeding_points_strict ? '>' : '≥'} ${formatNumber(level.min_seeding_points, 0)}`
  if (level.min_bonus) return `魔力 ${formatNumber(level.min_bonus, 0)}`
  if (level.min_seeding) return `做种 ${formatNumber(level.min_seeding, 0)}`
  return '—'
}

function levelHasDetails(level) {
  return Boolean(level.description?.trim() || level.alternatives?.length)
}

function levelAlternativeRequirements(level) {
  const numerals = ['一', '二', '三', '四', '五', '六']
  const fields = [
    ['min_join_days', '注册', durationLabel],
    ['min_upload', '上传', formatBytes],
    ['min_download', '下载', formatBytes],
    ['min_ratio', '分享率', value => formatNumber(value, 2)],
    ['min_bonus', '魔力', value => formatNumber(value, 0)],
    ['min_seeding_points', '做种积分', value => formatNumber(value, 0)],
    ['min_seeding', '做种数', value => formatNumber(value, 0)],
    ['min_seeding_size', '做种体积', formatBytes],
    ['min_torrent_uploads', '发布数', value => formatNumber(value, 0)],
    ['min_average_seeding_time_days', '平均做种时间', value => `${formatNumber(value, 1)} 天`],
  ]
  return (level.alternatives || []).map((option, index) => ({
    title: `任务${numerals[index] || index + 1}`,
    requirements: [
      ...fields.filter(([key]) => Number(option[key]) > 0).map(([key, label, formatter]) => (
        `${label} ${option[`${key}_strict`] ? '>' : '≥'} ${formatter(option[key])}`
      )),
      ...(option.unsupported_requirements || []).map(item => (
        `${item.label || '其他要求'} ${item.target || '需人工确认'}`
      )),
    ],
  }))
}

// ---------------------------------------------------------------------------
// 左侧站点列表的独立滚动：左右按钮翻页 + 鼠标按住拖动
// ---------------------------------------------------------------------------

const retirementListRef = ref(null)
const retirementListCanScrollLeft = ref(false)
const retirementListCanScrollRight = ref(false)
const retirementListDragging = ref(false)
let retirementListDrag = null
let retirementListSuppressClick = false

function updateRetirementListScrollState() {
  const element = retirementListRef.value
  if (!element) return
  const maxScroll = element.scrollWidth - element.clientWidth
  retirementListCanScrollLeft.value = element.scrollLeft > 2
  retirementListCanScrollRight.value = maxScroll > 2 && element.scrollLeft < maxScroll - 2
}

function scrollRetirementList(direction) {
  const element = retirementListRef.value
  if (!element) return
  const step = Math.max(Math.round(element.clientWidth * 0.8), 200)
  element.scrollBy({ left: direction * step, behavior: 'smooth' })
  window.setTimeout(updateRetirementListScrollState, 360)
}

function onRetirementListPointerDown(event) {
  const element = retirementListRef.value
  if (!element || event.pointerType !== 'mouse' || event.button !== 0) return
  if (element.scrollWidth <= element.clientWidth + 1) return
  retirementListDrag = {
    startX: event.clientX,
    startScroll: element.scrollLeft,
    pointerId: event.pointerId,
    moved: false,
  }
  try {
    element.setPointerCapture(event.pointerId)
  } catch {
    // 浏览器不支持指针捕获时忽略，拖动退化为普通滚动
  }
}

function onRetirementListPointerMove(event) {
  const drag = retirementListDrag
  const element = retirementListRef.value
  if (!drag || !element || event.pointerId !== drag.pointerId) return
  const delta = event.clientX - drag.startX
  if (!drag.moved && Math.abs(delta) > 5) {
    drag.moved = true
    retirementListDragging.value = true
  }
  if (!drag.moved) return
  element.scrollLeft = drag.startScroll - delta
  updateRetirementListScrollState()
}

function onRetirementListPointerEnd(event) {
  const drag = retirementListDrag
  const element = retirementListRef.value
  retirementListDrag = null
  retirementListDragging.value = false
  if (!drag || !element) return
  try {
    element.releasePointerCapture(drag.pointerId)
  } catch {
    // 指针已释放时忽略
  }
  if (drag.moved) {
    // 拖动结束短时间内抑制 click，避免误切换站点
    retirementListSuppressClick = true
    window.setTimeout(() => {
      retirementListSuppressClick = false
    }, 320)
  }
}

function selectRetirementSite(site) {
  if (retirementListSuppressClick) return
  selectedRetirementSiteKey.value = retirementSiteKey(site)
}

watch(
  () => sortedRetirementSites.value.map(retirementSiteKey).join('|'),
  async () => {
    const sites = sortedRetirementSites.value
    if (!sites.some(site => retirementSiteKey(site) === selectedRetirementSiteKey.value)) {
      selectedRetirementSiteKey.value = retirementSiteKey(sites[0])
    }
    await nextTick()
    updateRetirementListScrollState()
  },
  { immediate: true },
)

watch(selectedRetirementSiteKey, () => {
  selectedRouteLevelName.value = ''
})

onMounted(() => {
  updateRetirementListScrollState()
  window.addEventListener('resize', updateRetirementListScrollState)

  if (typeof ResizeObserver !== 'undefined') {
    resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) detailWidth.value = entry.contentRect.width
    })
    if (detailRef.value) resizeObserver.observe(detailRef.value)
  }

  // 实测筛选条高度，写进变量供面板 calc 使用，保证与总览 Tab 总高一致。
  const summary = document.querySelector('.retirement-summary')
  if (summary) {
    const applySummaryHeight = () => {
      summaryHeight.value = Math.round(summary.getBoundingClientRect().height + 12)
    }
    applySummaryHeight()
    window.requestAnimationFrame(applySummaryHeight)
  }
})

// 窄屏时把总体进度圆盘缩小，给右侧要求表留出空间，避免等级轨道被迫横向滚动。
const detailRef = ref(null)
const detailWidth = ref(0)
/** 筛选条 + 间距实测高度，用于把养老面板总高对齐到 720px。 */
const summaryHeight = ref(39)
// 圆盘尺寸按明细面板实际可用宽度决定：宽度越小圆盘越小，
// 始终把右侧要求表留在可视区内，避免出现横向滚动条。
const scoreSize = computed(() => {
  const width = detailWidth.value
  if (!width) return 124
  if (width < 520) return 64
  if (width < 640) return 76
  if (width < 760) return 88
  if (width < 900) return 100
  return 124
})
const scoreWidth = computed(() => (scoreSize.value < 100 ? 8 : 12))

/** 圆盘列宽跟随圆盘尺寸，保证左右两栏总宽不超过明细面板。 */
const overviewStyle = computed(() => {
  const size = scoreSize.value
  return { '--score-column': `${size + 20}px` }
})
let resizeObserver = null

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateRetirementListScrollState)
  resizeObserver?.disconnect()
  resizeObserver = null
})
</script>

<template>
  <div class="ptm-retire" :style="{ '--summary-height': `${summaryHeight}px` }">
    <!-- 十二大进度：节点卡片式时间线，展示站点头像、名称与加入日期 -->
    <section class="twelve-panel" aria-label="十二大进度">
      <div class="twelve-panel__head">
        <div class="twelve-panel__title">
          <span class="twelve-panel__icon"><VIcon icon="mdi-crown-outline" size="16" /></span>
          <strong>十二大进度</strong>
        </div>
        <div class="twelve-panel__stats">
          <span class="twelve-panel__stat">
            <b>{{ twelveJoinedCount }}</b><em>/ {{ twelveTotalCount }}</em><small>已加入</small>
          </span>
          <span class="twelve-panel__divider" />
          <span class="twelve-panel__stat">
            <b class="text-success">{{ twelvePercent }}%</b><small>完成进度</small>
          </span>
          <span class="twelve-panel__divider" />
          <span class="twelve-panel__stat">
            <b>{{ twelveRemainingCount }}</b><small>剩余站点</small>
          </span>
        </div>
      </div>
      <div class="twelve-overflow">
        <div class="twelve-track" role="list" aria-label="十二大站点进度">
          <div class="twelve-track__line"><i :style="{ width: `${twelveTrackPercent}%` }" /></div>
          <div
            v-for="(item, index) in twelveItems"
            :key="item.key"
            class="twelve-node"
            :class="`twelve-node--${item.state}`"
            role="listitem"
            :title="item.state === 'joined' ? `${item.name}${item.join_at ? '，加入于 ' + item.join_at : ''}` : twelveStateMeta(item.state).label"
          >
            <span class="twelve-node__index">{{ index + 1 }}</span>
            <span class="twelve-node__marker">
              <SiteAvatar
                v-if="item.state === 'joined' && item.site_id"
                :api="api"
                :site="{ site_id: item.site_id, name: item.name }"
                :size="38"
              />
              <VAvatar v-else :size="38" color="secondary" variant="tonal">
                <VIcon :icon="twelveStateMeta(item.state).icon" size="19" />
              </VAvatar>
            </span>
            <strong v-if="item.state === 'joined'" class="twelve-node__name">{{ item.name }}</strong>
            <em v-else class="twelve-node__lock">{{ twelveStateMeta(item.state).label }}</em>
            <small v-if="item.state === 'joined'" class="twelve-node__date">
              {{ twelveJoinDate(item.join_at) }}
            </small>
          </div>
        </div>
      </div>
    </section>

    <div class="retirement-summary">
      <button
        v-for="item in STATUS_FILTERS"
        :key="item.key"
        type="button"
        class="retirement-chip"
        :class="{
          'retirement-chip--active': statusFilter === item.key,
          'retirement-chip--wealthy': item.key === 'wealthy_retired',
        }"
        :style="{ '--chip-color': `rgb(var(--v-theme-${item.color}))` }"
        :aria-pressed="statusFilter === item.key"
        @click="toggleStatusFilter(item.key)"
      >
        <VIcon v-if="item.key === 'wealthy_retired'" icon="mdi-crown" size="14" />
        {{ item.label }} {{ statusCount(item.key) }}
      </button>
    </div>

    <section class="retirement-explorer">
      <aside class="retirement-site-list" aria-label="养老进度站点列表">
        <div class="retirement-site-list__heading"><strong>站点列表</strong><span>{{ listHeadingText }}</span></div>
        <VSelect
          v-model="retirementSortKey"
          :items="retirementSortOptions"
          label="排序方式"
          prepend-inner-icon="mdi-sort"
          density="compact"
          variant="outlined"
          hide-details
          class="retirement-site-sort"
        />
        <div class="retirement-site-list__body">
          <button
            type="button"
            class="retirement-site-nav"
            aria-label="向左滚动站点列表"
            :disabled="!retirementListCanScrollLeft"
            @click="scrollRetirementList(-1)"
          ><VIcon icon="mdi-chevron-left" size="20" /></button>
          <div
            ref="retirementListRef"
            class="retirement-site-list__items"
            :class="{ 'is-dragging': retirementListDragging }"
            @scroll.passive="updateRetirementListScrollState"
            @pointerdown="onRetirementListPointerDown"
            @pointermove="onRetirementListPointerMove"
            @pointerup="onRetirementListPointerEnd"
            @pointercancel="onRetirementListPointerEnd"
            @pointerleave="onRetirementListPointerEnd"
          >
            <div v-if="!sortedRetirementSites.length" class="retirement-empty-list">
              <VIcon icon="mdi-filter-off-outline" size="30" />
              <span>该状态下没有站点</span>
              <small>点击上方「全部」查看全部站点</small>
            </div>
            <button
              v-for="site in sortedRetirementSites"
              :key="retirementSiteKey(site)"
              type="button"
              class="retirement-site-option"
              :class="{ 'retirement-site-option--selected': retirementSiteKey(site) === retirementSiteKey(selectedRetirementSite), 'retirement-site-option--wealthy': site.status === 'wealthy_retired' }"
              :aria-pressed="retirementSiteKey(site) === retirementSiteKey(selectedRetirementSite)"
              @click="selectRetirementSite(site)"
            >
              <SiteAvatar :api="api" :site="avatarSite(site)" :size="42" />
              <span class="retirement-site-option__body">
                <span class="retirement-site-option__title"><strong>{{ site.site_name }}</strong><em v-if="site.status !== 'wealthy_retired'" :class="`status-${site.status}`">{{ retirementMeta(site.status, site).label }}</em></span>
                <span>{{ site.current_level || '站点未提供等级' }}</span>
                <VProgressLinear :model-value="nextLevelOverallProgress(site)" :color="site.status === 'wealthy_retired' ? 'warning' : 'primary'" bg-color="surface-variant" height="4" rounded />
              </span>
              <small>{{ site.status === 'wealthy_retired' ? '富贵养老' : `${nextLevelOverallProgress(site)}%` }}</small>
            </button>
          </div>
          <button
            type="button"
            class="retirement-site-nav"
            aria-label="向右滚动站点列表"
            :disabled="!retirementListCanScrollRight"
            @click="scrollRetirementList(1)"
          ><VIcon icon="mdi-chevron-right" size="20" /></button>
        </div>
      </aside>

      <article v-if="selectedRetirementSite" ref="detailRef" class="retirement-detail">
        <header class="retirement-detail__header">
          <div class="retirement-detail__identity">
            <SiteAvatar :api="api" :site="avatarSite(selectedRetirementSite)" :size="58" />
            <div><h3>{{ selectedRetirementSite.site_name }}</h3><span>当前等级 <strong>{{ selectedRetirementSite.current_level || '站点未提供' }}</strong></span><span v-if="selectedRetirementSite.retirement_level">目标等级 <strong class="target-level">{{ selectedRetirementSite.retirement_level }}（保号）</strong></span></div>
          </div>
          <div class="retirement-detail__right">
            <VChip v-if="selectedRetirementSite.status === 'wealthy_retired'" class="wealthy-retirement-badge" prepend-icon="mdi-crown" variant="flat">富贵养老</VChip>
            <div class="retirement-detail__metrics">
              <span>上传<strong>{{ formatBytes(selectedRetirementSite.upload) }}</strong></span>
              <span>下载<strong>{{ formatBytes(selectedRetirementSite.download) }}</strong></span>
              <span>分享率<strong>{{ field(selectedRetirementSite.ratio, 2) }}</strong></span>
            </div>
          </div>
        </header>

        <div v-if="selectedRetirementSite.status === 'wealthy_retired'" class="wealthy-retirement-state" aria-label="富贵养老状态">
          <div class="wealthy-retirement-state__icon"><VIcon icon="mdi-crown" size="28" /></div>
          <div><span>{{ selectedRetirementSite.wealthy_retirement_manual ? '手动指定站点' : 'VIP 会员等级' }}</span><strong>富贵养老</strong><small>{{ selectedRetirementSite.wealthy_retirement_manual ? '已在设置中手动标记；完整等级路线仍可在下方查看。' : '会员等级不强行映射普通等级，完整等级路线仍可在下方查看。' }}</small></div>
        </div>

        <div v-else-if="selectedRetirementView.route.length" class="retirement-route-rail" aria-label="等级进度">
          <div class="retirement-route-rail__track" :style="selectedRetirementView.routeStyle">
            <div class="retirement-route-rail__line">
              <VProgressLinear :model-value="selectedRetirementView.routeProgress" color="primary" bg-color="secondary" :bg-opacity="0.3" height="5" rounded />
            </div>
            <div class="retirement-route-rail__nodes">
              <button
                v-for="(level, index) in selectedRetirementView.route"
                :key="level.name"
                type="button"
                class="retirement-route-node"
                :class="{ 'is-reached': level.reached, 'is-current': level.is_current, 'is-next': level.name === selectedRetirementSite.next_level, 'is-retirement': level.is_retirement, 'is-selected': level.name === selectedRetirementView.displayedLevel?.name }"
                :aria-pressed="level.name === selectedRetirementView.displayedLevel?.name"
                :aria-label="`查看 ${level.name} 等级进度`"
                @click="selectedRouteLevelName = level.name"
              >
                <i class="retirement-route-node__marker" aria-hidden="true">{{ index + 1 }}</i>
                <strong class="retirement-route-node__name"><span>{{ splitLevelName(level).local }}</span><span v-if="splitLevelName(level).english">{{ splitLevelName(level).english }}</span></strong>
                <em class="retirement-route-node__badge">{{ routeNodeStatus(selectedRetirementSite, level) }}</em>
              </button>
            </div>
          </div>
        </div>

        <div v-if="selectedRetirementSite.status !== 'wealthy_retired' && selectedRetirementView.route.length" class="retirement-target-grid">
          <section class="requirement-panel">
            <div class="requirement-panel__heading">
              <div><VIcon icon="mdi-target" color="primary" size="34" /><span>{{ selectedRetirementView.isDefaultLevel ? '下一等级' : '所选等级' }}</span><strong>{{ selectedRetirementView.displayedLevel?.name || '已是最高等级' }}</strong></div>
              <div class="requirement-panel__spacer" aria-hidden="true" />
              <VChip :color="selectedRetirementView.displayedLevel?.reached ? 'success' : 'warning'" size="small" variant="tonal" :prepend-icon="selectedRetirementView.displayedLevel?.reached ? 'mdi-check-circle-outline' : 'mdi-clock-outline'">{{ selectedRetirementView.eta.label }}<template v-if="selectedRetirementView.eta.days !== null"> · 约 {{ selectedRetirementView.eta.days }} 天</template></VChip>
            </div>
            <div
              v-if="selectedRetirementView.requirements.length"
              class="requirement-overview"
              :style="overviewStyle"
            >
              <div class="requirement-overview__score">
                <VProgressCircular :model-value="selectedRetirementView.overallProgress" :size="scoreSize" :width="scoreWidth" color="primary"><strong>{{ selectedRetirementView.overallProgress }}%</strong></VProgressCircular>
                <span>总体进度</span><b>{{ selectedRetirementView.overallProgress }}%</b>
                <small>
                  已完成 {{ selectedRetirementView.completedCount }} 项 · 待完成 {{ selectedRetirementView.pendingCount }} 项<template
                    v-if="selectedRetirementView.unknownCount"
                  > · 未提供 {{ selectedRetirementView.unknownCount }} 项</template>
                </small>
              </div>
              <div class="requirement-table-wrap">
                <div class="requirement-table">
                  <div class="requirement-table__head"><span>项目</span><span>目标要求</span><span>当前进度</span><span>剩余</span><span>时间</span><span>完成进度</span></div>
                  <div v-for="row in selectedRetirementView.requirements" :key="row.key" class="requirement-row">
                    <span class="requirement-row__item"><VIcon :icon="row.icon" color="secondary" size="22" /><strong>{{ row.label }}</strong></span>
                    <span>{{ row.target }}</span>
                    <strong :class="{ 'text-success': row.complete }">{{ row.current }}</strong>
                    <span :class="{ 'text-success': row.complete, 'text-warning': row.unavailable }">{{ row.complete ? '—' : row.detail.replace(/^剩余\s*/, '') }}</span>
                    <span>{{ row.eta }}</span>
                    <span v-if="row.unavailable && !row.complete" class="requirement-row__progress">
                      <span class="requirement-row__unknown">未提供，不计入进度</span>
                    </span>
                    <span v-else class="requirement-row__progress"><VProgressLinear :model-value="row.progress" :color="row.complete ? 'success' : 'primary'" bg-color="surface-variant" height="7" rounded /><b>{{ Math.round(row.progress) }}%</b></span>
                  </div>
                </div>
              </div>
            </div>
            <div v-else class="compact-empty-state">{{ selectedRetirementView.displayedLevel ? '该等级没有要求数据' : '没有后续等级要求' }}</div>
          </section>
        </div>

        <section v-if="selectedRetirementView.levels.length" class="retirement-levels">
          <div class="retirement-levels__heading"><div><VIcon icon="mdi-chart-bar" color="primary" /><strong>等级路线与要求</strong></div></div>
          <div class="retirement-levels__table-wrap">
            <div class="retirement-levels__table">
            <div class="retirement-levels__columns"><span>等级</span><span>注册</span><span>流量</span><span>分享率</span><span>做种积分</span><i /></div>
            <details v-for="level in selectedRetirementView.levels" :key="level.name" class="retirement-level-row" :class="{ 'has-detail': levelHasDetails(level) }" :open="levelHasDetails(level) && (level.is_current || level.name === selectedRetirementSite.next_level)">
              <summary @click="!levelHasDetails(level) && $event.preventDefault()">
                <strong>{{ level.name }}</strong>
                <span data-label="注册">{{ level.min_join_days ? `${level.min_join_days_strict ? '>' : '≥'} ${durationLabel(level.min_join_days)}` : '无限制' }}</span>
                <span class="retirement-level-row__traffic" data-label="流量"><span v-for="item in levelTrafficRequirements(level)" :key="item">{{ item }}</span></span>
                <span data-label="分享率">{{ levelRatioRequirement(level).replace(/^分享率\s*/, '') }}</span>
                <span data-label="做种积分">{{ levelPointsRequirement(level).replace(/^做种积分\s*/, '') }}</span>
                <VIcon v-if="levelHasDetails(level)" icon="mdi-chevron-down" size="18" />
              </summary>
              <div v-if="level.description || level.alternatives?.length" class="retirement-level-row__detail" :class="{ 'has-alternatives': level.description && level.alternatives?.length }">
                <div v-if="level.description" class="retirement-level-row__description">
                  <div class="retirement-level-row__detail-title"><VIcon icon="mdi-text-box-outline" size="18" /><strong>等级说明</strong></div>
                  <p>{{ level.description }}</p>
                </div>
                <div v-if="level.alternatives?.length" class="retirement-level-row__alternatives">
                  <div class="retirement-level-row__detail-title"><VIcon icon="mdi-call-split" size="18" /><strong>任选条件</strong></div>
                  <p>满足以下任一任务即可达到该等级</p>
                  <div class="retirement-level-row__tasks">
                    <div v-for="task in levelAlternativeRequirements(level)" :key="task.title" class="retirement-level-row__task">
                      <strong>{{ task.title }}</strong>
                      <span v-for="requirement in task.requirements" :key="requirement">{{ requirement }}</span>
                    </div>
                  </div>
                </div>
              </div>
            </details>
          </div>
          </div>
        </section>
      </article>
      <article v-else class="retirement-detail retirement-detail--empty">
        <div class="retirement-empty-detail">
          <VIcon icon="mdi-shield-sun-outline" size="42" />
          <strong>没有可展示的站点</strong>
          <span>当前筛选「{{ currentFilterLabel }}」下没有站点，点击上方「全部」查看全部 {{ retirement.sites?.length || 0 }} 个站点。</span>
        </div>
      </article>
    </section>
  </div>
</template>

<style scoped>
.ptm-retire {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: var(--ptm-tab-h, clamp(560px, calc(100vh - 120px), 1100px));
  min-width: 0;
  min-height: 0;
  /* 左右留白，让十二大面板与站点面板不贴外层边框 */
  padding: 0 4px;
}

/* 面板填满所在 Tab 的剩余高度，与其它 Tab 天然等高。 */
.retirement-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  /* 与十二大面板、站点面板保持同一左右边界 */
  margin: 0 4px;
  padding: 0 18px;
}

/* 十二大进度时间线 */
.twelve-panel {
  background: linear-gradient(
    135deg,
    rgba(var(--v-theme-primary), 0.07),
    rgba(var(--v-theme-surface), 0.72)
  );
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 16px;
  flex: 0 0 auto;
  /* 与下方站点面板左右对齐并内缩，避免紧贴外层边框 */
  margin: 0 4px;
  padding: 14px 18px 10px;
}

.twelve-panel__head {
  align-items: center;
  display: flex;
  gap: 16px;
  justify-content: space-between;
}

.twelve-panel__title {
  align-items: center;
  display: flex;
  gap: 7px;
}

.twelve-panel__icon {
  align-items: center;
  background: rgba(var(--v-theme-primary), 0.14);
  border-radius: 8px;
  color: rgb(var(--v-theme-primary));
  display: flex;
  height: 26px;
  justify-content: center;
  width: 26px;
}

.twelve-panel__title strong {
  font-size: 0.98rem;
}

.twelve-panel__stats {
  align-items: center;
  display: flex;
  gap: 14px;
}

.twelve-panel__stat {
  align-items: baseline;
  display: grid;
  grid-template-columns: auto auto;
  column-gap: 4px;
}

.twelve-panel__stat b {
  font-size: 1.15rem;
  line-height: 1.1;
}

.twelve-panel__stat em {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.76rem;
  font-style: normal;
}

.twelve-panel__stat small {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.64rem;
  grid-column: 1 / -1;
}

.twelve-panel__divider {
  background: rgba(var(--v-theme-on-surface), 0.14);
  height: 26px;
  width: 1px;
}

.twelve-panel__percent {
  align-items: baseline;
  display: flex;
  gap: 8px;
}

.twelve-panel__percent strong {
  color: rgb(var(--v-theme-success));
  font-size: 1.1rem;
}

.twelve-panel__percent span {
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.7rem;
}

.twelve-overflow {
  overflow-x: auto;
  overscroll-behavior-x: auto;
}

.twelve-track {
  display: grid;
  gap: 0;
  grid-template-columns: repeat(12, minmax(62px, 1fr));
  min-width: 760px;
  padding: 8px 0 2px;
  position: relative;
}

.twelve-track__line {
  background: rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 999px;
  height: 4px;
  left: 4.15%;
  overflow: hidden;
  position: absolute;
  right: 4.15%;
  top: 32px;
  z-index: 0;
}

.twelve-track__line i {
  background: linear-gradient(90deg, rgb(var(--v-theme-primary)), rgb(var(--v-theme-success)));
  border-radius: inherit;
  display: block;
  height: 100%;
}

.twelve-node {
  align-items: center;
  display: grid;
  gap: 2px;
  /* 序号 / 头像 / 站点名 / 加入日期 */
  grid-template-rows: 14px 44px auto auto;
  justify-items: center;
  min-width: 0;
  position: relative;
  text-align: center;
  z-index: 1;
}

.twelve-node--missing,
.twelve-node--waiting {
  opacity: 0.66;
}

.twelve-node__index {
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.64rem;
  font-weight: 700;
  line-height: 1;
}

.twelve-node__marker {
  background: rgb(var(--v-theme-surface));
  border: 3px solid rgba(var(--v-theme-on-surface), 0.2);
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgb(var(--v-theme-surface));
  display: grid;
  height: 42px;
  place-items: center;
  width: 42px;
}

.twelve-node--joined .twelve-node__marker {
  border-color: rgb(var(--v-theme-primary));
  box-shadow: 0 0 0 4px rgb(var(--v-theme-surface)), 0 0 14px rgba(var(--v-theme-primary), 0.3);
}

.twelve-node__name {
  font-size: 0.74rem;
  font-weight: 600;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 加入日期：比站点名更弱，保持一行不换行 */
.twelve-node__date {
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.64rem;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 未加入节点的占位文案 */
.twelve-node__lock {
  color: rgba(var(--v-theme-on-surface), 0.42);
  font-size: 0.62rem;
  font-style: normal;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* 可点击的状态筛选标签 */
.retirement-chip {
  align-items: center;
  appearance: none;
  background: rgba(var(--v-theme-on-surface), 0.05);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.14);
  border-radius: 999px;
  color: rgba(var(--v-theme-on-surface), 0.78);
  cursor: pointer;
  display: flex;
  font: inherit;
  font-size: 0.72rem;
  font-weight: 700;
  gap: 5px;
  letter-spacing: 0.02em;
  padding: 4px 13px;
  transition: background 0.15s ease, border-color 0.15s ease, color 0.15s ease;
}

.retirement-chip:hover {
  background: rgba(var(--v-theme-on-surface), 0.1);
  border-color: var(--chip-color);
}

.retirement-chip--active {
  background: color-mix(in srgb, var(--chip-color) 20%, transparent);
  border-color: var(--chip-color);
  color: var(--chip-color);
}

.retirement-chip--wealthy {
  color: #e0a91f;
}

.retirement-chip--wealthy.retirement-chip--active {
  background: linear-gradient(135deg, rgba(117, 72, 0, 0.34), rgba(224, 169, 31, 0.16));
  border-color: #d9a11c;
  box-shadow: 0 5px 16px rgba(224, 169, 31, 0.18);
  color: #ffd977;
}

/* 左站点列表 + 右明细，两侧各自独立滚动。
   高度取固定值而非视口相关表达式：避免切换 Tab 或与总览页对比时忽高忽低。 */
.retirement-explorer {
  align-items: stretch;
  background: rgba(var(--v-theme-surface), 0.44);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 18px;
  display: grid;
  grid-template-columns: minmax(240px, 300px) minmax(0, 1fr);
  /* 与总览 Tab 共用同一高度基准，减去筛选条与间距后填充剩余空间。 */
  flex: 1 1 auto;
  /* 与十二大面板左右对齐 */
  margin: 0 4px;
  min-height: 0;
  overflow: hidden;
}

.retirement-site-list {
  background: rgba(var(--v-theme-surface-variant), 0.1);
  border-right: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  min-width: 0;
  overflow: hidden;
  /* 左侧多一点留白，让站点条目与面板边框左右对称 */
  padding: 14px 12px 14px 16px;
}

.retirement-site-list__heading {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  padding: 2px 4px 12px;
}

.retirement-site-list__heading span {
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.7rem;
}

.retirement-site-sort {
  flex: 0 0 auto;
  margin-bottom: 10px;
  width: 100%;
}

.retirement-site-list__body {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  min-height: 0;
}

.retirement-site-list__items {
  align-content: start;
  display: grid;
  flex: 1 1 auto;
  gap: 5px;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: auto;
  scrollbar-gutter: stable;
}

.retirement-site-list__items.is-dragging {
  cursor: grabbing;
  user-select: none;
}

/* 仅横向布局（窄屏）显示翻页按钮 */
.retirement-site-nav {
  align-items: center;
  background: rgba(var(--v-theme-surface), 0.6);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 10px;
  color: rgba(var(--v-theme-on-surface), 0.8);
  cursor: pointer;
  display: none;
  flex: 0 0 auto;
  justify-content: center;
  min-width: 34px;
  transition: background 0.15s ease, color 0.15s ease;
  width: 34px;
}

.retirement-site-nav:hover:not(:disabled) {
  background: rgba(var(--v-theme-primary), 0.18);
  color: rgb(var(--v-theme-primary));
}

.retirement-site-nav:disabled {
  cursor: default;
  opacity: 0.32;
}

.retirement-site-option {
  align-items: center;
  appearance: none;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 12px;
  color: inherit;
  cursor: pointer;
  display: grid;
  font: inherit;
  gap: 10px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  padding: 11px 10px;
  text-align: left;
  transition: background-color 0.16s ease, border-color 0.16s ease;
  width: 100%;
}

.retirement-site-option:hover,
.retirement-site-option:focus-visible {
  background: rgba(var(--v-theme-primary), 0.08);
  border-color: rgba(var(--v-theme-primary), 0.34);
  outline: none;
}

.retirement-site-option--selected {
  background: rgba(var(--v-theme-primary), 0.12);
  border-color: rgba(var(--v-theme-primary), 0.46);
}

.retirement-site-option--wealthy {
  border-color: rgba(224, 169, 31, 0.34);
}

.retirement-site-option--wealthy.retirement-site-option--selected {
  background: linear-gradient(135deg, rgba(117, 72, 0, 0.26), rgba(var(--v-theme-primary), 0.11));
  border-color: #d9a11c;
}

.retirement-site-option__body {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.retirement-site-option__body > span:nth-child(2) {
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.7rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.retirement-site-option__title {
  align-items: center;
  display: flex;
  gap: 7px;
  justify-content: space-between;
  min-width: 0;
}

.retirement-site-option__title strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.retirement-site-option__title em {
  flex: 0 0 auto;
  font-size: 0.66rem;
  font-style: normal;
  font-weight: 700;
}

.status-upgrading { color: rgb(var(--v-theme-warning)); }
.status-retired { color: rgb(var(--v-theme-success)); }
.status-rule_missing { color: rgb(var(--v-theme-secondary)); }

.retirement-site-option > small {
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.68rem;
  font-weight: 700;
}

.retirement-detail {
  min-height: 0;
  min-width: 0;
  overflow-y: auto;
  overscroll-behavior: auto;
  padding: 20px;
  scrollbar-gutter: stable;
}

.retirement-detail__header {
  align-items: center;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  display: flex;
  gap: 24px;
  justify-content: space-between;
  padding-bottom: 18px;
}

.retirement-detail__identity {
  align-items: center;
  display: flex;
  gap: 14px;
  min-width: 0;
}

.retirement-detail__identity > div {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.retirement-detail__identity h3 {
  font-size: 1.2rem;
  margin: 0;
}

.retirement-detail__identity span {
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.72rem;
}

.retirement-detail__identity span strong {
  color: rgba(var(--v-theme-on-surface), 0.86);
}

.retirement-detail__identity .target-level {
  color: rgb(var(--v-theme-success));
}

.retirement-detail__right {
  align-items: flex-end;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.retirement-detail__metrics {
  align-items: center;
  display: flex;
  flex: 0 0 auto;
  gap: 22px;
}

.retirement-detail__metrics span {
  color: rgba(var(--v-theme-on-surface), 0.52);
  display: flex;
  flex-direction: column;
  font-size: 0.68rem;
  gap: 3px;
}

.retirement-detail__metrics strong {
  color: rgba(var(--v-theme-on-surface), 0.9);
  font-size: 0.86rem;
}

.wealthy-retirement-state {
  align-items: center;
  background: linear-gradient(135deg, rgba(117, 72, 0, 0.2), rgba(var(--v-theme-surface), 0.58));
  border: 1px solid rgba(224, 169, 31, 0.34);
  border-radius: 16px;
  display: flex;
  gap: 15px;
  margin-top: 24px;
  padding: 18px 20px;
}

.wealthy-retirement-state__icon {
  background: linear-gradient(135deg, #744800, #e0a91f);
  border-radius: 50%;
  box-shadow: 0 8px 24px rgba(224, 169, 31, 0.2);
  color: #fff5cb;
  display: grid;
  flex: 0 0 48px;
  height: 48px;
  place-items: center;
  width: 48px;
}

.wealthy-retirement-state > div:last-child {
  display: flex;
  flex-direction: column;
  gap: 3px;
  min-width: 0;
}

.wealthy-retirement-state span {
  color: #d7b55d;
  font-size: 0.7rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.wealthy-retirement-state strong {
  color: #fff1b5;
  font-size: 1.08rem;
}

.wealthy-retirement-state small {
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.72rem;
}

/* 等级进度轨道 */
.retirement-route-rail {
  overflow-x: auto;
  padding: 22px 12px 14px;
}

.retirement-route-rail__track {
  min-width: 860px;
  position: relative;
}

.retirement-route-rail__line {
  left: var(--route-inset);
  position: absolute;
  top: 23px;
  width: var(--route-span);
  z-index: 0;
}

.retirement-route-rail__nodes {
  align-items: start;
  display: grid;
  grid-template-columns: repeat(var(--route-count), minmax(80px, 1fr));
  position: relative;
  z-index: 1;
}

.retirement-route-node {
  appearance: none;
  background: transparent;
  border: 0;
  border-radius: 12px;
  color: inherit;
  cursor: pointer;
  display: grid;
  font: inherit;
  gap: 5px;
  grid-template-rows: 48px auto 24px;
  min-width: 0;
  padding: 0 5px;
  place-items: center;
  text-align: center;
}

.retirement-route-node:hover,
.retirement-route-node:focus-visible {
  background: rgba(var(--v-theme-primary), 0.08);
  outline: none;
}

.retirement-route-node:focus-visible {
  box-shadow: inset 0 0 0 2px rgb(var(--v-theme-primary));
}

.retirement-route-node__marker {
  background: rgb(var(--v-theme-surface));
  border: 4px solid rgba(var(--v-theme-on-surface), 0.32);
  border-radius: 50%;
  box-shadow: 0 0 0 4px rgb(var(--v-theme-surface));
  color: rgba(var(--v-theme-on-surface), 0.82);
  display: grid;
  font-size: 0.9rem;
  font-style: normal;
  font-weight: 900;
  height: 38px;
  place-items: center;
  position: relative;
  width: 38px;
  z-index: 1;
}

.retirement-route-rail__nodes .is-reached .retirement-route-node__marker {
  background: rgb(var(--v-theme-primary));
  border-color: rgb(var(--v-theme-primary));
}

.retirement-route-rail__nodes .is-next .retirement-route-node__marker {
  background: rgba(var(--v-theme-primary), 0.34);
  border-color: rgb(var(--v-theme-primary));
}

.retirement-route-rail__nodes .is-current .retirement-route-node__marker,
.retirement-route-rail__nodes .is-next .retirement-route-node__marker {
  box-shadow: 0 0 0 4px rgb(var(--v-theme-surface)), 0 0 0 7px rgba(var(--v-theme-primary), 0.18);
}

.retirement-route-rail__nodes .is-retirement .retirement-route-node__marker {
  background: rgb(var(--v-theme-success));
  border-color: rgb(var(--v-theme-success));
}

.retirement-route-rail__nodes .is-selected .retirement-route-node__marker {
  box-shadow: 0 0 0 4px rgb(var(--v-theme-surface)), 0 0 0 8px rgb(var(--v-theme-primary));
}

.retirement-route-rail__nodes strong {
  color: rgba(var(--v-theme-on-surface), 0.78);
  font-size: 0.7rem;
  line-height: 1.2;
  max-width: 100%;
}

.retirement-route-node__name {
  align-content: start;
  display: grid;
  gap: 1px;
  min-height: 34px;
  place-items: center;
}

.retirement-route-node__name > span {
  display: block;
  max-width: 100%;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.retirement-route-node__name > span + span {
  font-size: 0.66rem;
  text-transform: uppercase;
}

.retirement-route-node__badge {
  background: rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 999px;
  color: rgba(var(--v-theme-on-surface), 0.68);
  font-size: 0.6rem;
  font-style: normal;
  font-weight: 800;
  line-height: 16px;
  padding: 2px 9px;
  white-space: nowrap;
}

.retirement-route-rail__nodes .is-current strong,
.retirement-route-rail__nodes .is-current .retirement-route-node__badge,
.retirement-route-rail__nodes .is-next strong,
.retirement-route-rail__nodes .is-next .retirement-route-node__badge {
  color: rgb(var(--v-theme-primary));
}

.retirement-route-rail__nodes .is-retirement strong,
.retirement-route-rail__nodes .is-retirement .retirement-route-node__badge {
  color: rgb(var(--v-theme-success));
}

.retirement-route-rail__nodes .is-current .retirement-route-node__badge,
.retirement-route-rail__nodes .is-next .retirement-route-node__badge {
  background: rgba(var(--v-theme-primary), 0.16);
}

.retirement-route-rail__nodes .is-retirement .retirement-route-node__badge {
  background: rgba(var(--v-theme-success), 0.12);
}

/* 目标等级要求 */
.retirement-target-grid {
  display: grid;
  gap: 14px;
  grid-template-columns: minmax(0, 1fr);
  margin-top: 16px;
}

.requirement-panel,
.retirement-levels {
  background: rgba(var(--v-theme-surface-variant), 0.1);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 14px;
  min-width: 0;
}

.requirement-panel {
  padding: 15px;
}

.requirement-panel__heading {
  align-items: center;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  display: grid;
  gap: 12px;
  grid-template-columns: auto minmax(0, 1fr) auto;
  padding-bottom: 14px;
}

.requirement-panel__heading > div:first-child {
  align-items: center;
  display: flex;
  gap: 9px;
}

.requirement-panel__heading span {
  color: rgba(var(--v-theme-on-surface), 0.56);
  font-size: 0.72rem;
}

.requirement-panel__heading strong {
  font-size: 1.22rem;
  margin-left: 3px;
}

.requirement-panel__spacer {
  min-width: 0;
}

.requirement-overview {
  display: grid;
  gap: 20px;
  grid-template-columns: var(--score-column, 144px) minmax(0, 1fr);
  padding-top: 14px;
}

.requirement-overview__score {
  align-items: center;
  border-right: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  display: flex;
  flex-direction: column;
  gap: 5px;
  justify-content: center;
}

.requirement-overview__score :deep(.v-progress-circular__content) > strong {
  font-size: 1.35rem;
}

.requirement-overview__score > span {
  color: rgba(var(--v-theme-on-surface), 0.56);
  font-size: 0.68rem;
  margin-top: 2px;
}

.requirement-overview__score > b {
  font-size: 1.25rem;
}

.requirement-overview__score > small {
  color: rgba(var(--v-theme-on-surface), 0.54);
  font-size: 0.64rem;
}

/* 表格列宽有下限，外层包裹器负责横向滚动，
   避免 grid 子项的 min-width 直接撑开面板导致进度条溢出。 */
.requirement-table-wrap,
.retirement-levels__table-wrap {
  min-width: 0;
  overflow-x: hidden;
  overscroll-behavior-x: auto;
}

.requirement-table {
  min-width: 0;
  width: 100%;
  max-width: 100%;
}

.requirement-table__head,
.requirement-row {
  align-items: center;
  display: grid;
  gap: 12px;
  grid-template-columns:
    minmax(0, 0.86fr)
    minmax(0, 0.7fr)
    minmax(0, 0.72fr)
    minmax(0, 0.62fr)
    minmax(0, 0.66fr)
    minmax(60px, 1.12fr);
}

/* 列宽全部按比例分配（下限为 0），容器变窄时自动压缩，不会触发横向滚动。 */
@media (max-width: 1240px) {
  .requirement-table__head,
  .requirement-row {
    gap: 8px;
  }
}

.requirement-table__head {
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.65rem;
  padding: 7px 10px;
}

.requirement-row {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  font-size: 0.7rem;
  min-height: 42px;
  padding: 8px 10px;
}

.requirement-row__item {
  align-items: center;
  display: flex;
  gap: 10px;
}

.requirement-row__progress {
  align-items: center;
  display: grid;
  gap: 9px;
  grid-template-columns: minmax(0, 1fr) 34px;
  min-width: 0;
}

/* 站点未提供该指标：不显示进度条，改用文字说明 */
.requirement-row__unknown {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.68rem;
  white-space: nowrap;
}

/* 所有单元格都允许收缩并裁剪，避免内容把表格撑宽产生横向滚动。 */
.requirement-row > *,
.requirement-table__head > * {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
}

.requirement-row__item strong {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.requirement-row__progress b {
  text-align: right;
}

.compact-empty-state {
  color: rgba(var(--v-theme-on-surface), 0.5);
  display: grid;
  font-size: 0.76rem;
  min-height: 88px;
  place-items: center;
}

.retirement-empty-list {
  align-items: center;
  color: rgba(var(--v-theme-on-surface), 0.5);
  display: grid;
  gap: 4px;
  justify-items: center;
  padding: 26px 12px;
  text-align: center;
}

.retirement-empty-list > span {
  font-size: 0.8rem;
  font-weight: 600;
}

.retirement-empty-list > small {
  font-size: 0.68rem;
  opacity: 0.8;
}

.retirement-detail--empty {
  display: grid;
  place-items: center;
}

.retirement-empty-detail {
  align-items: center;
  color: rgba(var(--v-theme-on-surface), 0.52);
  display: grid;
  gap: 8px;
  justify-items: center;
  max-width: 320px;
  text-align: center;
}

.retirement-empty-detail > strong {
  font-size: 1rem;
}

.retirement-empty-detail > span {
  font-size: 0.78rem;
  line-height: 1.5;
}

/* 完整等级路线表 */
.retirement-levels {
  margin-top: 14px;
  overflow: hidden;
}

.retirement-levels__heading {
  align-items: center;
  display: flex;
  gap: 12px;
  justify-content: space-between;
  padding: 18px 20px;
}

.retirement-levels__heading > div {
  align-items: center;
  display: flex;
  gap: 8px;
}

.retirement-levels__table {
  min-width: 760px;
}

.retirement-levels__columns,
.retirement-level-row summary {
  align-items: center;
  display: grid;
  gap: 14px;
  grid-template-columns: minmax(125px, 1fr) minmax(95px, 0.75fr) minmax(190px, 1.4fr) minmax(95px, 0.7fr) minmax(125px, 0.9fr) 24px;
  padding: 13px 20px;
}

.retirement-levels__columns {
  background: rgba(var(--v-theme-primary), 0.09);
  color: rgba(var(--v-theme-on-surface), 0.64);
  font-size: 0.72rem;
}

.retirement-level-row {
  background: transparent;
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  overflow: hidden;
}

.retirement-level-row[open] {
  background: rgba(var(--v-theme-primary), 0.055);
  box-shadow: inset 3px 0 rgb(var(--v-theme-primary));
}

.retirement-level-row summary {
  cursor: default;
  font-size: 0.78rem;
  list-style: none;
  min-height: 64px;
  position: relative;
}

.retirement-level-row.has-detail summary {
  cursor: pointer;
}

.retirement-level-row summary::-webkit-details-marker {
  display: none;
}

.retirement-level-row summary > strong {
  font-size: 0.82rem;
}

.retirement-level-row summary > span {
  color: rgba(var(--v-theme-on-surface), 0.68);
}

.retirement-level-row__traffic {
  display: grid;
  gap: 3px;
}

.retirement-level-row summary > .v-icon {
  transition: transform 0.18s ease;
}

.retirement-level-row[open] summary > .v-icon {
  transform: rotate(180deg);
}

.retirement-level-row__detail {
  border-top: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  color: rgba(var(--v-theme-on-surface), 0.76);
  display: grid;
  font-size: 0.76rem;
  gap: 20px;
  padding: 22px 28px 24px 36px;
}

.retirement-level-row__detail.has-alternatives {
  grid-template-columns: minmax(0, 1fr) minmax(0, 1.05fr);
}

.retirement-level-row__description,
.retirement-level-row__alternatives {
  min-width: 0;
}

.retirement-level-row__alternatives {
  border-left: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  padding-left: 22px;
}

.retirement-level-row__detail-title {
  align-items: center;
  color: rgba(var(--v-theme-on-surface), 0.94);
  display: flex;
  font-size: 0.86rem;
  gap: 9px;
}

.retirement-level-row__detail-title > .v-icon {
  color: rgb(var(--v-theme-primary));
}

.retirement-level-row__description p,
.retirement-level-row__alternatives p {
  line-height: 1.7;
  margin: 11px 0 0;
  overflow-wrap: anywhere;
}

.retirement-level-row__tasks {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
}

.retirement-level-row__task {
  display: grid;
  gap: 4px;
  min-width: 0;
}

/* 窄屏：站点列表转为横向排布，显示翻页按钮 */
@media (max-width: 960px) {
  .retirement-explorer {
    grid-template-columns: minmax(0, 1fr);
    /* 站点列表定高、明细流式，总高度与宽屏一致，切换 Tab 不会忽高忽低 */
    grid-template-rows: 300px minmax(0, 1fr);
    /* 窄屏同样沿用共用高度基准，由 flex 填充剩余空间 */
    height: auto;
  }

  .retirement-site-list {
    border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
    border-right: 0;
    height: 300px;
    max-height: none;
  }

  .retirement-site-list__body {
    flex-direction: row;
    gap: 8px;
  }

  .retirement-site-nav {
    display: flex;
  }

  .retirement-site-list__items {
    grid-auto-flow: column;
    grid-template-rows: repeat(2, minmax(0, 1fr));
    overflow-x: auto;
    overflow-y: hidden;
  }

  /* 手机上改为整页滚动：明细不再自己滚，避免与外层滚动打架 */
  .retirement-detail {
    overflow-y: visible;
  }

  .retirement-site-option {
    width: 240px;
  }

  .requirement-overview {
    grid-template-columns: minmax(0, 1fr);
  }

  .requirement-overview__score {
    border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.12);
    border-right: 0;
    padding-bottom: 12px;
  }
}

/* 极窄容器：要求表改为两列堆叠行，彻底消除横向滚动。 */
@media (max-width: 700px) {
  .requirement-table__head {
    display: none;
  }

  .requirement-row {
    gap: 4px 10px;
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr);
    padding: 9px 10px;
  }

  .requirement-row > span,
  .requirement-row > strong {
    font-size: 0.72rem;
  }

  .requirement-row__progress {
    grid-column: 1 / -1;
  }

  .requirement-row > span:nth-child(2)::before {
    content: '目标 ';
    opacity: 0.55;
  }

  .requirement-row > strong:nth-child(3)::before {
    content: '当前 ';
    font-weight: 400;
    opacity: 0.55;
  }

  .requirement-row > span:nth-child(4)::before {
    content: '剩余 ';
    opacity: 0.55;
  }

  .requirement-row > span:nth-child(5)::before {
    content: '时间 ';
    opacity: 0.55;
  }
}

/* 中等宽度：总体进度圆盘缩小并靠左，与要求表同排，避免等级轨道被挤到需要横向滚动。 */
@media (max-width: 1240px) {
  .requirement-overview {
    gap: 10px;
    grid-template-columns: var(--score-column, 144px) minmax(0, 1fr);
  }

  .retirement-detail {
    padding: 14px;
  }
}

/* 圆盘列宽由组件按明细面板实测宽度注入，不再依赖视口断点。 */
.requirement-overview {
  grid-template-columns: var(--score-column, 144px) minmax(0, 1fr);
}

.requirement-overview__score {
  min-width: 0;
  overflow: hidden;
}
</style>
