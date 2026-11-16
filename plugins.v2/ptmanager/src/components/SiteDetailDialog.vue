<script setup>
/**
 * 单站点详情弹窗。
 *
 * 结构：头部（站点标识 + 操作）→ 核心流量大数（含趋势）→ 指标网格 →
 * 账号信息（紧凑标签）→ 站点页面扩展字段 → 原始字段。
 * 每类指标使用主题色强调，避免此前一片灰底白字、层级不清的问题。
 */
import { computed, ref, watch } from 'vue'
import SiteAvatar from './SiteAvatar.vue'
import Sparkline from './Sparkline.vue'
import { formatBytes, formatInteger, formatNumber, formatRatio, shortDate, shortTime, unwrapResponse, withQuery } from '../utils'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  site: { type: Object, default: null },
  api: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: 'PTManager' },
  // 该站点是否正在采集，用于按钮显示加载态
  collecting: { type: Boolean, default: false },
})

const emit = defineEmits(['update:modelValue', 'collect', 'message'])

const pluginBase = computed(() => `plugin/${props.pluginId}`)
const trend = ref([])
const loading = ref(false)
const showRaw = ref(false)

const extended = computed(() => props.site?.extended || null)

/** 时魔展示文本：与总览表格同口径，并标注数据来源。 */
const hourlyText = computed(() => {
  const site = props.site || {}
  if (site.hourly_bonus === null || site.hourly_bonus === undefined) return '—'
  const source =
    site.hourly_bonus_source === 'page'
      ? '站点页面'
      : site.hourly_bonus_source === 'estimate'
        ? '快照估算'
        : site.hourly_bonus_source === 'daily'
          ? '日均推算'
          : ''
  return `${formatNumber(site.hourly_bonus)}${source ? `（${source}）` : ''}`
})

/** 缺失值统一占位。 */
function value(value, formatter) {
  if (value === null || value === undefined || value === '') return '—'
  return formatter ? formatter(value) : String(value)
}

/** 头部站点摘要标签。 */
const accountChips = computed(() => {
  const site = props.site || {}
  const items = [
    { icon: 'mdi-account-outline', text: site.username || '未采集用户名' },
    { icon: 'mdi-identifier', text: site.uid ? `UID ${site.uid}` : 'UID 未知' },
    { icon: 'mdi-calendar-check-outline', text: site.join_at ? `加入 ${shortDate(site.join_at)}` : '加入日期未知' },
  ]
  if (site.career_days !== null && site.career_days !== undefined) {
    items.push({ icon: 'mdi-timer-outline', text: `在册 ${site.career_days} 天` })
  }
  items.push({ icon: 'mdi-bell-outline', text: `未读 ${formatInteger(site.message_unread || 0)}` })
  items.push({ icon: 'mdi-sort-numeric-ascending', text: `优先级 ${value(site.site_priority)}` })
  items.push({ icon: 'mdi-clock-outline', text: `数据 ${shortTime(site.updated_at)}` })
  return items
})

/** 核心流量大数，附趋势曲线。 */
const heroTiles = computed(() => {
  const site = props.site || {}
  return [
    {
      label: '上传量',
      value: formatBytes(site.upload),
      color: 'success',
      points: trendStats.value.upload,
      hint: site.daily_upload ? `日均 ${formatBytes(site.daily_upload)}` : '',
    },
    {
      label: '下载量',
      value: formatBytes(site.download),
      color: 'info',
      points: trendStats.value.download,
      hint: site.daily_download ? `日均 ${formatBytes(site.daily_download)}` : '',
    },
    {
      label: '分享率',
      value: formatRatio(site.ratio),
      color: site.ratio === null || site.ratio === undefined ? 'grey' : site.ratio >= 1 ? 'success' : 'error',
      points: [],
      hint: '按站点上传/下载计算',
    },
  ]
})

/** 其余指标网格。 */
const metricTiles = computed(() => {
  const site = props.site || {}
  const data = extended.value || {}
  return [
    { label: '做种数', value: formatInteger(site.seeding), icon: 'mdi-seed-outline', color: 'primary' },
    { label: '做种体积', value: formatBytes(site.seeding_size), icon: 'mdi-harddisk', color: 'teal' },
    { label: '下载中', value: formatInteger(site.leeching), icon: 'mdi-download-network-outline', color: 'info' },
    { label: '下载中体积', value: formatBytes(site.leeching_size), icon: 'mdi-swap-vertical', color: 'info' },
    { label: '魔力值', value: value(site.bonus, formatNumber), icon: 'mdi-coin', color: 'amber-darken-2' },
    {
      // 日均魔力 = 时魔 × 24，与上方「时魔」保持同一口径
      label: '日均魔力',
      value: site.daily_bonus ? formatNumber(site.daily_bonus) : '—',
      icon: 'mdi-chart-timeline-variant',
      color: 'amber-darken-1',
    },
    { label: '时魔', value: hourlyText.value, icon: 'mdi-timer-sand', color: 'deep-purple' },
    { label: '页面做种 / 下载中', value: `${value(data.seeding_now, formatInteger)} / ${value(data.leeching_now, formatInteger)}`, icon: 'mdi-access-point', color: 'indigo' },
  ]
})

/** 站点页面扩展字段，按类型分组展示。 */
const extendedTiles = computed(() => {
  const data = extended.value
  if (!data) return []
  const inviteText = (() => {
    const parts = []
    if (data.invites_available !== null && data.invites_available !== undefined) parts.push(`可用 ${data.invites_available}`)
    if (data.invites_sent !== null && data.invites_sent !== undefined) parts.push(`已发 ${data.invites_sent}`)
    if (!parts.length && data.invite_raw) parts.push(data.invite_raw)
    return parts.join(' · ') || '—'
  })()
  const hr = data.hr === null || data.hr === undefined ? '—' : formatInteger(data.hr)
  return [
    {
      label: 'H&R 未完成',
      value: hr,
      color: Number(data.hr) > 0 ? 'error' : 'success',
      raw: data.hr_raw || '',
    },
    { label: '邀请名额', value: inviteText, color: 'primary', raw: '' },
    { label: '邀请人', value: data.inviter || '—', color: 'cyan-darken-2', raw: '' },
    {
      label: '认领',
      value:
        data.claims_used === null || data.claims_used === undefined
          ? '—'
          : data.claims_total
            ? `${data.claims_used} / ${data.claims_total}`
            : formatInteger(data.claims_used),
      color: 'brown',
      raw: '',
    },
    {
      label: '做种积分',
      value: value(data.seeding_points, formatNumber),
      color: 'indigo',
      raw: '',
    },
    { label: '页面魔力值', value: value(data.bonus, formatNumber), color: 'amber-darken-2', raw: '' },
    { label: '做种时间', value: data.seeding_time || '—', color: 'teal', raw: '' },
    { label: '下载时间', value: data.leeching_time || '—', color: 'info', raw: '' },
    { label: '做种/下载时间比', value: value(data.time_ratio, item => formatNumber(item, 3)), color: 'deep-purple', raw: '' },
    { label: 'BT 客户端', value: data.client || '—', color: 'blue-grey', raw: '' },
    { label: '采集时间', value: shortTime(data.collected_at), color: 'blue-grey', raw: '' },
  ]
})

/** 趋势序列。 */
const trendStats = computed(() => {
  const items = trend.value || []
  const pick = key => items.map(item => Number(item[key]) || 0)
  return {
    upload: pick('upload'),
    download: pick('download'),
    bonus: pick('bonus'),
    seedingSize: pick('seeding_size'),
  }
})

/** 趋势图分组。 */
const trendGroups = computed(() => [
  { label: '上传', color: 'rgb(var(--v-theme-success))', points: trendStats.value.upload },
  { label: '下载', color: 'rgb(var(--v-theme-info))', points: trendStats.value.download },
  { label: '魔力', color: 'rgb(var(--v-theme-warning))', points: trendStats.value.bonus },
  { label: '做种体积', color: 'rgb(var(--v-theme-primary))', points: trendStats.value.seedingSize },
])

/** 拉取当前站点的历史趋势。 */
async function loadTrend() {
  if (!props.site?.domain) return
  loading.value = true
  try {
    const data = unwrapResponse(
      await props.api.get(withQuery(`${pluginBase.value}/site`, { domain: props.site.domain }), {
        feedback: 'silent',
      }),
    )
    trend.value = data?.trend || []
  } catch (error) {
    trend.value = []
    emit('message', { text: `读取趋势失败：${error.message}`, color: 'warning' })
  } finally {
    loading.value = false
  }
}

watch(
  () => [props.modelValue, props.site?.domain],
  ([open]) => {
    if (open) {
      showRaw.value = false
      loadTrend()
    }
  },
  { immediate: true },
)

/** 关闭对话框。 */
function close() {
  emit('update:modelValue', false)
}
</script>

<template>
  <VDialog
    :model-value="modelValue"
    max-width="940"
    scrollable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <VCard v-if="site" class="ptm-detail" rounded="lg">
      <div class="ptm-detail__head">
        <SiteAvatar :api="api" :site="site" :size="42" />
        <div class="ptm-detail__title">
          <div class="ptm-detail__name">
            {{ site.name }}
            <VChip v-if="site.user_level" size="x-small" variant="tonal" color="primary" class="ml-2">
              {{ site.user_level }}
            </VChip>
            <VChip
              v-if="!site.is_active"
              size="x-small"
              variant="tonal"
              color="grey"
              class="ml-1"
            >
              未启用
            </VChip>
          </div>
          <a class="ptm-detail__link" :href="site.url" target="_blank" rel="noreferrer">
            {{ site.domain }}
            <VIcon icon="mdi-open-in-new" size="12" />
          </a>
        </div>
        <VBtn
          :prepend-icon="collecting ? 'mdi-loading mdi-spin' : 'mdi-database-sync-outline'"
          :disabled="collecting"
          :variant="collecting ? 'tonal' : 'text'"
          :color="collecting ? 'primary' : undefined"
          size="small"
          class="ptm-detail__collect"
          :title="collecting ? '正在抓取该站点数据…' : '重新采集该站点数据（抓取站点页面后刷新趋势）'"
          @click="emit('collect', site.domain)"
        >
          {{ collecting ? '抓取中' : '采集' }}
        </VBtn>
        <VBtn icon="mdi-close" variant="text" size="small" @click="close" />
      </div>

      <VDivider />

      <VCardText class="ptm-detail__body">
        <VAlert v-if="site.err_msg" type="warning" variant="tonal" density="compact" class="mb-3">
          MoviePilot 最近一次采集异常：{{ site.err_msg }}
        </VAlert>
        <VAlert
          v-else-if="extended && !extended.ok"
          type="info"
          variant="tonal"
          density="compact"
          class="mb-3"
        >
          站点页面扩展字段尚未采集成功：{{ extended.error || '尚未采集' }}
        </VAlert>

        <div class="ptm-detail__hero">
          <div v-for="tile in heroTiles" :key="tile.label" class="ptm-hero" :class="`ptm-hero--${tile.color}`">
            <div class="ptm-hero__label">{{ tile.label }}</div>
            <div class="ptm-hero__value">{{ tile.value }}</div>
            <div v-if="tile.hint" class="ptm-hero__hint">{{ tile.hint }}</div>
            <Sparkline v-if="tile.points && tile.points.length" :points="tile.points" :color="`rgb(var(--v-theme-${tile.color}))`" />
          </div>
        </div>

        <div class="ptm-detail__chips">
          <span v-for="chip in accountChips" :key="chip.text" class="ptm-chip">
            <VIcon :icon="chip.icon" size="13" />
            {{ chip.text }}
          </span>
        </div>

        <div class="ptm-section">
          <span class="ptm-section__dot" />
          指标
        </div>
        <div class="ptm-tiles">
          <div v-for="tile in metricTiles" :key="tile.label" class="ptm-tile">
            <VIcon :icon="tile.icon" size="15" :color="tile.color" />
            <span class="ptm-tile__label">{{ tile.label }}</span>
            <span class="ptm-tile__value">{{ tile.value }}</span>
          </div>
        </div>

        <template v-if="extendedTiles.length">
          <div class="ptm-section">
            <span class="ptm-section__dot ptm-section__dot--accent" />
            站点页面扩展
            <span class="ptm-section__hint">来自 userdetails.php 深度采集</span>
          </div>
          <div class="ptm-tiles">
            <div
              v-for="tile in extendedTiles"
              :key="tile.label"
              class="ptm-tile"
              :class="`ptm-tile--${tile.color}`"
            >
              <span class="ptm-tile__label">{{ tile.label }}</span>
              <span class="ptm-tile__value">{{ tile.value }}</span>
              <span v-if="tile.raw" class="ptm-tile__raw">{{ tile.raw }}</span>
            </div>
          </div>
        </template>

        <div class="ptm-section">
          <span class="ptm-section__dot" />
          历史趋势（{{ trend.length }} 天）
        </div>
        <div v-if="trend.length" class="ptm-trend">
          <div v-for="group in trendGroups" :key="group.label" class="ptm-trend__item">
            <div class="ptm-trend__label">{{ group.label }}</div>
            <Sparkline :points="group.points" :color="group.color" />
          </div>
        </div>
        <div v-else class="text-caption text-medium-emphasis">暂无历史数据</div>

        <template v-if="extended?.raw?.length">
          <VExpansionPanels v-model="showRaw" variant="accordion" class="mt-4">
            <VExpansionPanel>
              <VExpansionPanelTitle class="text-body-2">
                页面原始字段（{{ extended.raw.length }}）
              </VExpansionPanelTitle>
              <VExpansionPanelText>
                <div class="ptm-detail__raw">
                  <div v-for="item in extended.raw" :key="item">{{ item }}</div>
                </div>
              </VExpansionPanelText>
            </VExpansionPanel>
          </VExpansionPanels>
        </template>
      </VCardText>
    </VCard>
  </VDialog>
</template>

<style scoped>
.ptm-detail__head {
  align-items: center;
  display: flex;
  gap: 10px;
  padding: 12px 14px;
  background: linear-gradient(
    90deg,
    rgba(var(--v-theme-primary), 0.16),
    rgba(var(--v-theme-primary), 0.02)
  );
}

.ptm-detail__title {
  flex: 1 1 auto;
  min-width: 0;
}

.ptm-detail__name {
  align-items: center;
  display: flex;
  font-size: 1.02rem;
  font-weight: 700;
}

.ptm-detail__link {
  align-items: center;
  color: rgba(var(--v-theme-on-surface), 0.7);
  display: inline-flex;
  font-size: 0.74rem;
  gap: 3px;
  text-decoration: none;
}

.ptm-detail__link:hover {
  color: rgb(var(--v-theme-primary));
}

.ptm-detail__body {
  max-height: 68vh;
  padding: 14px;
}

.ptm-detail__hero {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.ptm-hero {
  background: rgba(var(--v-theme-on-surface), 0.04);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 12px;
  overflow: hidden;
  padding: 10px 12px 8px;
  position: relative;
}

.ptm-hero::before {
  background: currentColor;
  content: '';
  height: 3px;
  left: 0;
  opacity: 0.9;
  position: absolute;
  right: 0;
  top: 0;
}

.ptm-hero--success {
  color: rgb(var(--v-theme-success));
}

.ptm-hero--info {
  color: rgb(var(--v-theme-info));
}

.ptm-hero--error {
  color: rgb(var(--v-theme-error));
}

.ptm-hero--grey {
  color: rgba(var(--v-theme-on-surface), 0.6);
}

.ptm-hero__label {
  font-size: 0.72rem;
  font-weight: 600;
  opacity: 0.85;
}

.ptm-hero__value {
  font-size: clamp(1.1rem, 2vw, 1.5rem);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  line-height: 1.25;
}

.ptm-hero__hint {
  color: rgba(var(--v-theme-on-surface), 0.62);
  font-size: 0.68rem;
}

.ptm-detail__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin-top: 12px;
}

.ptm-chip {
  align-items: center;
  background: rgba(var(--v-theme-on-surface), 0.06);
  border-radius: 999px;
  display: inline-flex;
  font-size: 0.72rem;
  gap: 4px;
  padding: 3px 9px;
}

.ptm-section {
  align-items: center;
  display: flex;
  font-size: 0.78rem;
  font-weight: 700;
  gap: 6px;
  letter-spacing: 0.03em;
  margin: 16px 0 8px;
}

.ptm-section__dot {
  background: rgba(var(--v-theme-on-surface), 0.35);
  border-radius: 50%;
  height: 6px;
  width: 6px;
}

.ptm-section__dot--accent {
  background: rgb(var(--v-theme-primary));
}

.ptm-section__hint {
  font-size: 0.68rem;
  font-weight: 400;
  opacity: 0.6;
}

.ptm-tiles {
  display: grid;
  gap: 6px;
  grid-template-columns: repeat(auto-fill, minmax(158px, 1fr));
}

.ptm-tile {
  align-items: center;
  background: rgba(var(--v-theme-on-surface), 0.04);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.07);
  border-radius: 10px;
  display: grid;
  gap: 0 6px;
  grid-template-columns: auto minmax(0, 1fr);
  padding: 7px 10px;
}

.ptm-tile__label {
  font-size: 0.7rem;
  opacity: 0.72;
}

.ptm-tile__value {
  font-size: 0.88rem;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  grid-column: 1 / -1;
  overflow-wrap: anywhere;
}

.ptm-tile__raw {
  font-size: 0.66rem;
  grid-column: 1 / -1;
  opacity: 0.55;
}

.ptm-tile--error {
  background: rgba(var(--v-theme-error), 0.12);
  border-color: rgba(var(--v-theme-error), 0.4);
  color: rgb(var(--v-theme-error));
}

.ptm-tile--success {
  background: rgba(var(--v-theme-success), 0.1);
  border-color: rgba(var(--v-theme-success), 0.32);
}

.ptm-trend {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fill, minmax(190px, 1fr));
}

.ptm-trend__item {
  background: rgba(var(--v-theme-on-surface), 0.04);
  border-radius: 10px;
  padding: 8px 10px;
}

.ptm-trend__label {
  font-size: 0.7rem;
  opacity: 0.72;
}

.ptm-detail__raw {
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 0.72rem;
  max-height: 200px;
  overflow-y: auto;
}

@media (max-width: 720px) {
  .ptm-detail__hero {
    grid-template-columns: minmax(0, 1fr);
  }
}
</style>
