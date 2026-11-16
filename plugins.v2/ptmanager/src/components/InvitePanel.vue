<script setup>
/**
 * 后宫（邀请）面板。
 *
 * 左侧站点列表显示成员数与风险数量，右侧展示该站的邀请名额与
 * 被邀者明细（用户名、邮箱、分享率、做种、最后汇报、状态），
 * 参考「后宫管理系统」的信息组织方式。
 */
import { computed, ref } from 'vue'
import SiteAvatar from './SiteAvatar.vue'
import { formatBytes, formatInteger, formatNumber } from '../utils'

const props = defineProps({
  invite: { type: Object, default: () => ({ sites: [] }) },
  sites: { type: Array, default: () => [] },
  api: { type: Object, default: () => ({}) },
  collecting: { type: Boolean, default: false },
})

const emit = defineEmits(['collect'])

const selectedDomain = ref('')
// 站点筛选：全部 / 有名额 / 有成员
const filter = ref('all')

const inviteSites = computed(() => props.invite?.sites || [])

const filteredSites = computed(() => {
  const items = inviteSites.value
  if (filter.value === 'quota') return items.filter(site => Number(site.invites_available || 0) > 0)
  if (filter.value === 'members') return items.filter(site => Number(site.invitee_count || 0) > 0)
  return items
})

const sortedSites = computed(() =>
  [...filteredSites.value].sort((left, right) => {
    if (right.danger_count !== left.danger_count) return right.danger_count - left.danger_count
    if (Number(right.invites_available || 0) !== Number(left.invites_available || 0)) {
      return Number(right.invites_available || 0) - Number(left.invites_available || 0)
    }
    if (right.invitee_count !== left.invitee_count) return right.invitee_count - left.invitee_count
    return String(left.site_name).localeCompare(String(right.site_name))
  }),
)

const selectedSite = computed(
  () =>
    sortedSites.value.find(site => site.domain === selectedDomain.value)
    || sortedSites.value[0]
    || null,
)

const members = computed(() => selectedSite.value?.invitees || [])

/** 汇总卡片数据。 */
const summaryItems = computed(() => {
  const data = props.invite || {}
  return [
    { label: '站点', value: formatInteger(data.site_count || 0), icon: 'mdi-server-network', color: 'primary' },
    {
      label: '有名额站点',
      value: formatInteger(data.quota_site_count || 0),
      icon: 'mdi-ticket-confirmation-outline',
      color: 'warning',
    },
    { label: '可用名额', value: formatInteger(data.available_total || 0), icon: 'mdi-ticket-confirmation', color: 'warning' },
    { label: '成员', value: formatInteger(data.invitee_total || 0), icon: 'mdi-account-group', color: 'info' },
    { label: '已发邀请', value: formatInteger(data.sent_total || 0), icon: 'mdi-send-check-outline', color: 'success' },
    {
      label: '风险成员',
      value: formatInteger((data.danger_total || 0) + (data.warning_total || 0)),
      icon: 'mdi-alert-outline',
      color: (data.danger_total || 0) > 0 ? 'error' : 'success',
    },
  ]
})

/** 筛选标签：带数量，点一次切换。 */
const filterChips = computed(() => {
  const items = inviteSites.value
  return [
    { key: 'all', label: '全部', count: items.length, color: 'primary' },
    {
      key: 'quota',
      label: '有名额',
      count: items.filter(site => Number(site.invites_available || 0) > 0).length,
      color: 'warning',
    },
    {
      key: 'members',
      label: '有成员',
      count: items.filter(site => Number(site.invitee_count || 0) > 0).length,
      color: 'info',
    },
  ]
})

/** 名额展示：未采集到显示占位，0 显示 0。 */
function quotaText(site) {
  const value = site?.invites_available
  return value === null || value === undefined ? '—' : String(value)
}

/** 站点列表右侧的风险徽标文案。 */
function riskText(site) {
  const danger = Number(site.danger_count || 0)
  const warning = Number(site.warning_count || 0)
  if (danger) return `危险 ${danger}`
  if (warning) return `较低 ${warning}`
  if (site.invitee_count) return '正常'
  return '无成员'
}

function riskColor(site) {
  const danger = Number(site.danger_count || 0)
  const warning = Number(site.warning_count || 0)
  if (danger) return 'error'
  if (warning) return 'warning'
  if (site.invitee_count) return 'success'
  return 'secondary'
}

/** 分享率显示：未提供时显示占位。 */
function ratioText(member) {
  if (member.ratio === null || member.ratio === undefined) {
    if (member.uploaded && !member.downloaded) return '∞'
    return '—'
  }
  return formatNumber(member.ratio, 3)
}

function ratioTone(member) {
  if (member.ratio_health === 'danger') return 'text-error'
  if (member.ratio_health === 'warning') return 'text-warning'
  if (member.ratio_health === 'good' || member.ratio_health === 'excellent') return 'text-success'
  return 'text-medium-emphasis'
}

/** 成员对应的站点头像数据（借用站点图标）。 */
const avatarSite = computed(() => {
  const site = selectedSite.value
  if (!site) return {}
  const base = (props.sites || []).find(item => item.domain === site.domain) || {}
  return { ...base, name: site.site_name, domain: site.domain }
})

function selectSite(site) {
  selectedDomain.value = site.domain
}
</script>

<template>
  <div class="ptm-invite">
    <div class="ptm-invite__summary">
      <div v-for="item in summaryItems" :key="item.label" class="ptm-invite__stat">
        <VIcon :icon="item.icon" :color="item.color" size="18" />
        <div>
          <span>{{ item.label }}</span>
          <strong :class="`text-${item.color}`">{{ item.value }}</strong>
        </div>
      </div>
      <VSpacer />
      <VBtn
        size="small"
        variant="tonal"
        color="primary"
        prepend-icon="mdi-account-multiple-plus-outline"
        :loading="collecting"
        :disabled="collecting"
        @click="emit('collect')"
      >
        {{ collecting ? '抓取中' : '采集后宫数据' }}
      </VBtn>
    </div>

    <div v-if="!inviteSites.length" class="ptm-invite__empty">
      <VIcon icon="mdi-account-multiple-outline" size="42" />
      <strong>还没有后宫数据</strong>
      <span>点击「采集后宫数据」抓取各站邀请页的被邀者列表</span>
    </div>

    <div v-else class="ptm-invite__explorer">
      <aside class="ptm-invite__list">
        <div class="ptm-invite__list-head">
          <div class="ptm-invite__filters">
            <button
              v-for="chip in filterChips"
              :key="chip.key"
              type="button"
              class="ptm-invite__filter"
              :class="{ 'ptm-invite__filter--active': filter === chip.key }"
              @click="filter = filter === chip.key ? 'all' : chip.key"
            >
              {{ chip.label }} {{ chip.count }}
            </button>
          </div>
        </div>
        <div class="ptm-invite__items">
          <button
            v-for="site in sortedSites"
            :key="site.domain"
            type="button"
            class="ptm-invite__item"
            :class="{ 'ptm-invite__item--active': site.domain === selectedSite?.domain }"
            @click="selectSite(site)"
          >
            <SiteAvatar :api="api" :site="{ name: site.site_name, domain: site.domain }" :size="32" />
            <span class="ptm-invite__item-body">
              <span class="ptm-invite__item-title">
                <strong>{{ site.site_name }}</strong>
                <span
                  class="ptm-invite__quota"
                  :class="{ 'ptm-invite__quota--has': Number(site.invites_available || 0) > 0 }"
                >
                  名额 {{ quotaText(site) }}
                </span>
              </span>
              <span class="ptm-invite__item-sub">
                成员 {{ formatInteger(site.invitee_count || 0) }} · {{ riskText(site) }}
              </span>
            </span>
          </button>
          <div v-if="!sortedSites.length" class="ptm-invite__empty ptm-invite__empty--inline">
            <span>没有符合条件的站点</span>
          </div>
        </div>
      </aside>

      <article v-if="selectedSite" class="ptm-invite__detail">
        <header class="ptm-invite__detail-head">
          <div class="ptm-invite__identity">
            <SiteAvatar :api="api" :site="avatarSite" :size="44" />
            <div>
              <h3>{{ selectedSite.site_name }}</h3>
              <span>成员 <strong>{{ formatInteger(selectedSite.invitee_count || 0) }}</strong></span>
            </div>
          </div>
          <div class="ptm-invite__counters">
            <div
              class="ptm-invite__counter"
              :class="{ 'ptm-invite__counter--hot': Number(selectedSite.invites_available || 0) > 0 }"
            >
              <span>可用名额</span>
              <strong>{{ quotaText(selectedSite) }}</strong>
            </div>
            <div class="ptm-invite__counter">
              <span>已发邀请</span>
              <strong>{{ selectedSite.invites_sent ?? '—' }}</strong>
            </div>
            <div class="ptm-invite__counter">
              <span>风险成员</span>
              <strong :class="selectedSite.danger_count ? 'text-error' : ''">
                {{ formatInteger((selectedSite.danger_count || 0) + (selectedSite.warning_count || 0)) }}
              </strong>
            </div>
          </div>
          <div class="ptm-invite__detail-meta">
            <VChip
              v-if="selectedSite.danger_count"
              color="error"
              size="small"
              variant="tonal"
            >
              危险 {{ selectedSite.danger_count }}
            </VChip>
            <VChip
              v-if="selectedSite.warning_count"
              color="warning"
              size="small"
              variant="tonal"
            >
              较低 {{ selectedSite.warning_count }}
            </VChip>
            <span v-if="selectedSite.collected_at" class="ptm-invite__time">
              采集 {{ selectedSite.collected_at }}
            </span>
          </div>
        </header>

        <VAlert
          v-if="!selectedSite.ok && selectedSite.error"
          type="warning"
          variant="tonal"
          density="compact"
          class="mb-3"
        >
          后宫数据采集失败：{{ selectedSite.error }}
        </VAlert>

        <div v-if="members.length" class="ptm-invite__table-wrap">
          <div class="ptm-invite__table">
            <div class="ptm-invite__row ptm-invite__row--head">
              <span>成员</span>
              <span>邮箱</span>
              <span>上传</span>
              <span>下载</span>
              <span>分享率</span>
              <span>做种</span>
              <span>最后汇报</span>
              <span>状态</span>
            </div>
            <div v-for="member in members" :key="member.username + member.email" class="ptm-invite__row">
              <span class="ptm-invite__member">
                <a
                  v-if="member.profile_url"
                  :href="member.profile_url"
                  target="_blank"
                  rel="noreferrer"
                  @click.stop
                >{{ member.username }}</a>
                <template v-else>{{ member.username }}</template>
              </span>
              <span class="ptm-invite__muted">{{ member.email || '—' }}</span>
              <span>{{ formatBytes(member.uploaded) }}</span>
              <span>{{ formatBytes(member.downloaded) }}</span>
              <span :class="ratioTone(member)">{{ ratioText(member) }}</span>
              <span>{{ formatInteger(member.seeding_count || 0) }}</span>
              <span class="ptm-invite__muted">{{ member.last_seen || '—' }}</span>
              <span :class="member.disabled ? 'text-error' : 'ptm-invite__muted'">{{ member.status || '—' }}</span>
            </div>
          </div>
        </div>
        <div v-else class="ptm-invite__empty ptm-invite__empty--inline">
          <VIcon icon="mdi-account-off-outline" size="30" />
          <span>该站点暂未被邀者</span>
        </div>
      </article>

      <article v-else class="ptm-invite__detail">
        <div class="ptm-invite__empty">
          <VIcon icon="mdi-account-multiple-outline" size="36" />
          <span>请选择左侧站点</span>
        </div>
      </article>
    </div>
  </div>
</template>

<style scoped>
.ptm-invite {
  display: flex;
  flex-direction: column;
  gap: 12px;
  height: var(--ptm-tab-h, clamp(560px, calc(100vh - 120px), 1100px));
  min-height: 0;
  padding: 0 4px;
}

@media (max-width: 1200px) {
  .ptm-invite {
    height: auto;
  }
}

.ptm-invite__summary {
  align-items: center;
  background: linear-gradient(135deg, rgba(var(--v-theme-primary), 0.07), rgba(var(--v-theme-surface), 0.72));
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 14px;
  display: flex;
  flex: 0 0 auto;
  gap: 18px;
  margin: 0 4px;
  padding: 10px 16px;
}

.ptm-invite__stat {
  align-items: center;
  display: flex;
  gap: 8px;
}

.ptm-invite__stat span {
  color: rgba(var(--v-theme-on-surface), 0.56);
  display: block;
  font-size: 0.66rem;
}

.ptm-invite__stat strong {
  font-size: 1rem;
  font-variant-numeric: tabular-nums;
}

.ptm-invite__explorer {
  display: grid;
  flex: 1 1 auto;
  gap: 0;
  grid-template-columns: minmax(230px, 290px) minmax(0, 1fr);
  margin: 0 4px;
  min-height: 0;
}

.ptm-invite__list {
  background: rgba(var(--v-theme-surface-variant), 0.1);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 16px 0 0 16px;
  border-right: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
  padding: 12px;
}

.ptm-invite__list-head {
  align-items: center;
  display: flex;
  gap: 10px;
  justify-content: space-between;
  padding: 0 4px 10px;
}

.ptm-invite__list-head span {
  color: rgba(var(--v-theme-on-surface), 0.52);
  font-size: 0.68rem;
}

.ptm-invite__items {
  align-content: start;
  display: grid;
  flex: 1 1 auto;
  gap: 5px;
  min-height: 0;
  overflow-y: auto;
}

.ptm-invite__item {
  align-items: center;
  background: transparent;
  border: 1px solid transparent;
  border-radius: 11px;
  color: inherit;
  cursor: pointer;
  display: flex;
  gap: 9px;
  padding: 8px 9px;
  text-align: left;
  transition: background-color 0.16s ease, border-color 0.16s ease;
  width: 100%;
}

.ptm-invite__item:hover {
  background: rgba(var(--v-theme-primary), 0.08);
  border-color: rgba(var(--v-theme-primary), 0.32);
}

.ptm-invite__item--active {
  background: rgba(var(--v-theme-primary), 0.12);
  border-color: rgba(var(--v-theme-primary), 0.46);
}

.ptm-invite__item-body {
  display: grid;
  gap: 3px;
  min-width: 0;
}

.ptm-invite__item-title {
  align-items: center;
  display: flex;
  gap: 6px;
  min-width: 0;
}

.ptm-invite__item-title strong {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ptm-invite__item-sub {
  color: rgba(var(--v-theme-on-surface), 0.56);
  font-size: 0.68rem;
}

/* 筛选标签：全部 / 有名额 / 有成员 */
.ptm-invite__filters {
  display: flex;
  flex-wrap: wrap;
  gap: 5px;
}

.ptm-invite__filter {
  background: rgba(var(--v-theme-on-surface), 0.05);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.14);
  border-radius: 999px;
  color: inherit;
  cursor: pointer;
  font-size: 0.68rem;
  padding: 3px 9px;
  transition: background-color 0.15s ease, border-color 0.15s ease;
}

.ptm-invite__filter:hover {
  background: rgba(var(--v-theme-primary), 0.12);
}

.ptm-invite__filter--active {
  background: rgba(var(--v-theme-primary), 0.2);
  border-color: rgba(var(--v-theme-primary), 0.6);
  color: rgb(var(--v-theme-primary));
  font-weight: 600;
}

/* 站点行里的名额徽标：有名额时高亮 */
.ptm-invite__quota {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.16);
  border-radius: 999px;
  color: rgba(var(--v-theme-on-surface), 0.62);
  flex: 0 0 auto;
  font-size: 0.64rem;
  font-variant-numeric: tabular-nums;
  padding: 1px 6px;
}

.ptm-invite__quota--has {
  background: rgba(var(--v-theme-warning), 0.16);
  border-color: rgba(var(--v-theme-warning), 0.6);
  color: rgb(var(--v-theme-warning));
  font-weight: 700;
}

/* 详情头部三个计数块 */
.ptm-invite__counters {
  display: flex;
  gap: 8px;
}

.ptm-invite__counter {
  background: rgba(var(--v-theme-on-surface), 0.04);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  border-radius: 10px;
  display: grid;
  gap: 1px;
  min-width: 74px;
  padding: 5px 10px;
  text-align: center;
}

.ptm-invite__counter span {
  color: rgba(var(--v-theme-on-surface), 0.56);
  font-size: 0.64rem;
}

.ptm-invite__counter strong {
  font-size: 0.95rem;
  font-variant-numeric: tabular-nums;
}

.ptm-invite__counter--hot {
  background: rgba(var(--v-theme-warning), 0.14);
  border-color: rgba(var(--v-theme-warning), 0.55);
}

.ptm-invite__counter--hot strong {
  color: rgb(var(--v-theme-warning));
}

.ptm-invite__detail {
  border: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  border-radius: 0 16px 16px 0;
  min-height: 0;
  overflow-y: auto;
  padding: 16px 18px;
}

.ptm-invite__detail-head {
  align-items: center;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.1);
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
  justify-content: space-between;
  padding-bottom: 12px;
}

.ptm-invite__identity {
  align-items: center;
  display: flex;
  gap: 12px;
}

.ptm-invite__identity h3 {
  font-size: 1.05rem;
  margin: 0 0 2px;
}

.ptm-invite__identity span {
  color: rgba(var(--v-theme-on-surface), 0.58);
  font-size: 0.72rem;
}

.ptm-invite__identity strong {
  color: rgba(var(--v-theme-on-surface), 0.86);
}

.ptm-invite__detail-meta {
  align-items: center;
  display: flex;
  gap: 8px;
}

.ptm-invite__time {
  color: rgba(var(--v-theme-on-surface), 0.5);
  font-size: 0.68rem;
}

.ptm-invite__table-wrap {
  margin-top: 12px;
  overflow-x: auto;
}

.ptm-invite__table {
  min-width: 720px;
}

.ptm-invite__row {
  align-items: center;
  border-bottom: 1px solid rgba(var(--v-theme-on-surface), 0.07);
  display: grid;
  font-size: 0.76rem;
  gap: 10px;
  grid-template-columns: minmax(110px, 1.1fr) minmax(120px, 1.3fr) 90px 90px 74px 60px 132px 74px;
  padding: 7px 4px;
}

.ptm-invite__row--head {
  background: rgba(var(--v-theme-on-surface), 0.05);
  border-radius: 8px;
  color: rgba(var(--v-theme-on-surface), 0.6);
  font-size: 0.68rem;
  font-weight: 600;
  padding: 7px 4px;
}

.ptm-invite__member {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ptm-invite__member a {
  color: inherit;
  text-decoration: none;
}

.ptm-invite__member a:hover {
  text-decoration: underline;
}

.ptm-invite__muted {
  color: rgba(var(--v-theme-on-surface), 0.56);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ptm-invite__empty {
  align-items: center;
  color: rgba(var(--v-theme-on-surface), 0.52);
  display: grid;
  gap: 6px;
  justify-items: center;
  padding: 40px 16px;
  text-align: center;
}

.ptm-invite__empty--inline {
  padding: 28px 16px;
}

.ptm-invite__empty strong {
  color: rgba(var(--v-theme-on-surface), 0.72);
  font-size: 0.95rem;
}

.ptm-invite__empty span {
  font-size: 0.76rem;
}

@media (max-width: 1200px) {
  .ptm-invite__explorer {
    grid-template-columns: minmax(0, 1fr);
    grid-template-rows: 260px minmax(0, 1fr);
  }

  .ptm-invite__list {
    border-radius: 16px 16px 0 0;
    border-right: 1px solid rgba(var(--v-theme-on-surface), 0.12);
  }

  .ptm-invite__detail {
    border-radius: 0 0 16px 16px;
    border-top: 0;
  }
}
</style>
