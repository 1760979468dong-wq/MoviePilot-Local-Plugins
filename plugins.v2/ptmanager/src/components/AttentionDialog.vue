<script setup>
/**
 * H&R 与邀请名额明细弹窗。
 *
 * 总览页的合计卡片只保留上传、下载、做种数与做种体积，H&R 与邀请这类
 * 「需要处理的账号事项」改为可点击入口，点开后在这里逐站列出明细，
 * 回答「具体是哪个站」。
 */
import { computed, ref, watch } from 'vue'
import SiteAvatar from './SiteAvatar.vue'
import { formatInteger, shortTime } from '../utils'

const props = defineProps({
  modelValue: { type: Boolean, default: false },
  sites: { type: Array, default: () => [] },
  initialTab: { type: String, default: 'hr' },
  api: { type: Object, default: () => ({}) },
})

const emit = defineEmits(['update:modelValue', 'open-site'])

const tab = ref('hr')
const onlyWithValue = ref(true)

watch(
  () => [props.modelValue, props.initialTab],
  ([open, initial]) => {
    if (open) {
      tab.value = initial === 'invite' ? 'invite' : 'hr'
      onlyWithValue.value = true
    }
  },
  { immediate: true },
)

/** 扩展字段取值辅助。 */
function extended(site) {
  return site?.extended || {}
}

/** 有未完成 H&R 的站点，按数量从多到少。 */
const hrRows = computed(() =>
  props.sites
    .map(site => ({ site, hr: Number(extended(site).hr) || 0 }))
    .filter(row => row.hr > 0)
    .sort((left, right) => right.hr - left.hr),
)

/** 邀请相关站点：默认只看有可用名额或已发出邀请的站点。 */
const inviteRows = computed(() =>
  props.sites
    .map(site => {
      const data = extended(site)
      return {
        site,
        available: Number(data.invites_available) || 0,
        sent: Number(data.invites_sent) || 0,
        inviter: data.inviter || '',
        raw: data.invite_raw || '',
      }
    })
    .filter(row => {
      if (onlyWithValue.value) return row.available > 0 || row.sent > 0
      return true
    })
    .sort((left, right) => right.available - left.available || right.sent - left.sent),
)

/** 汇总数字，用于弹窗顶部说明。 */
const totals = computed(() => {
  const hrTotal = hrRows.value.reduce((sum, row) => sum + row.hr, 0)
  const available = props.sites.reduce(
    (sum, site) => sum + (Number(extended(site).invites_available) || 0),
    0,
  )
  const sent = props.sites.reduce((sum, site) => sum + (Number(extended(site).invites_sent) || 0), 0)
  const missing = props.sites.filter(site => {
    const data = extended(site)
    return data.hr === null || data.hr === undefined
  }).length
  return { hrTotal, available, sent, missing }
})

/** 关闭弹窗。 */
function close() {
  emit('update:modelValue', false)
}

/** 打开对应站点详情。 */
function openSite(site) {
  emit('open-site', site)
}
</script>

<template>
  <VDialog
    :model-value="modelValue"
    max-width="900"
    scrollable
    @update:model-value="emit('update:modelValue', $event)"
  >
    <VCard class="ptm-attention" rounded="lg">
      <VToolbar color="surface" density="comfortable" flat>
        <VToolbarTitle class="text-subtitle-1">
          {{ tab === 'hr' ? 'H&R 明细' : '邀请明细' }}
          <span class="text-caption text-medium-emphasis ml-2">
            {{ tab === 'hr' ? `合计 ${formatInteger(totals.hrTotal)} 个未完成` : `可用 ${formatInteger(totals.available)} · 已发 ${formatInteger(totals.sent)}` }}
          </span>
        </VToolbarTitle>
        <VBtn icon="mdi-close" variant="text" @click="close" />
      </VToolbar>

      <VTabs v-model="tab" density="comfortable" color="primary">
        <VTab value="hr" prepend-icon="mdi-alert-octagon-outline">
          H&amp;R
          <VChip
            v-if="hrRows.length"
            class="ml-2"
            size="x-small"
            variant="flat"
            color="error"
          >
            {{ hrRows.length }}
          </VChip>
        </VTab>
        <VTab value="invite" prepend-icon="mdi-account-plus-outline">
          邀请
          <VChip
            v-if="inviteRows.length"
            class="ml-2"
            size="x-small"
            variant="flat"
            color="primary"
          >
            {{ inviteRows.length }}
          </VChip>
        </VTab>
      </VTabs>

      <VDivider />

      <VCardText class="ptm-attention__body">
        <template v-if="tab === 'hr'">
          <VAlert v-if="!hrRows.length" type="success" variant="tonal" density="comfortable">
            当前没有未完成的 H&amp;R。
            <span v-if="totals.missing" class="text-caption">
              （{{ totals.missing }} 个站点未采集到 H&amp;R 数据）
            </span>
          </VAlert>
          <div v-else class="ptm-attention__list">
            <button
              v-for="row in hrRows"
              :key="row.site.domain"
              type="button"
              class="ptm-attention__row"
              @click="openSite(row.site)"
            >
              <SiteAvatar :api="api" :site="row.site" :size="30" />
              <span class="ptm-attention__name">
                <span class="ptm-attention__title">{{ row.site.name }}</span>
                <span class="ptm-attention__sub">{{ row.site.domain }}</span>
              </span>
              <span class="ptm-attention__raw">{{ extended(row.site).hr_raw || '' }}</span>
              <VChip color="error" size="small" variant="tonal">{{ formatInteger(row.hr) }}</VChip>
              <VIcon icon="mdi-chevron-right" size="18" />
            </button>
          </div>
        </template>

        <template v-else>
          <div class="d-flex align-center justify-space-between flex-wrap ga-2 mb-2">
            <span class="text-caption text-medium-emphasis">
              共 {{ inviteRows.length }} 个站点；点击任意站点查看详情
            </span>
            <VSwitch
              v-model="onlyWithValue"
              density="compact"
              hide-details
              color="primary"
              label="只显示有名额或已发邀请的站点"
            />
          </div>
          <div class="ptm-attention__list">
            <button
              v-for="row in inviteRows"
              :key="row.site.domain"
              type="button"
              class="ptm-attention__row ptm-attention__row--invite"
              @click="openSite(row.site)"
            >
              <SiteAvatar :api="api" :site="row.site" :size="30" />
              <span class="ptm-attention__name">
                <span class="ptm-attention__title">{{ row.site.name }}</span>
                <span class="ptm-attention__sub">
                  邀请人：{{ row.inviter || '未采集' }}
                </span>
              </span>
              <span class="ptm-attention__metric">
                <span class="ptm-attention__metric-label">可用</span>
                <span
                  class="ptm-attention__metric-value"
                  :class="{ 'ptm-attention__metric-value--zero': !row.available }"
                >
                  {{ formatInteger(row.available) }}
                </span>
              </span>
              <span class="ptm-attention__metric">
                <span class="ptm-attention__metric-label">已发</span>
                <span
                  class="ptm-attention__metric-value"
                  :class="{ 'ptm-attention__metric-value--zero': !row.sent }"
                >
                  {{ formatInteger(row.sent) }}
                </span>
              </span>
              <VIcon icon="mdi-chevron-right" size="18" />
            </button>
          </div>
        </template>
      </VCardText>

      <VDivider />
      <VCardActions class="justify-end">
        <VBtn variant="text" @click="close">关闭</VBtn>
      </VCardActions>
    </VCard>
  </VDialog>
</template>

<style scoped>
.ptm-attention__body {
  max-height: 62vh;
}

.ptm-attention__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ptm-attention__row {
  align-items: center;
  background: rgba(var(--v-theme-on-surface), 0.03);
  border: 1px solid rgba(var(--v-theme-on-surface), 0.08);
  border-radius: 10px;
  cursor: pointer;
  display: grid;
  gap: 10px;
  grid-template-columns: 30px minmax(0, 1fr) auto auto 20px;
  padding: 8px 10px;
  text-align: left;
  transition: background 0.15s ease, border-color 0.15s ease;
  width: 100%;
}

.ptm-attention__row--invite {
  grid-template-columns: 30px minmax(0, 1fr) 72px 72px 20px;
}

.ptm-attention__row:hover {
  background: rgba(var(--v-theme-primary), 0.1);
  border-color: rgba(var(--v-theme-primary), 0.4);
}

.ptm-attention__name {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ptm-attention__title {
  font-weight: 600;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ptm-attention__sub {
  font-size: 0.72rem;
  opacity: 0.7;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ptm-attention__raw {
  font-size: 0.75rem;
  opacity: 0.7;
}

.ptm-attention__metric {
  display: flex;
  flex-direction: column;
  text-align: right;
}

.ptm-attention__metric-label {
  font-size: 0.66rem;
  opacity: 0.65;
}

.ptm-attention__metric-value {
  font-variant-numeric: tabular-nums;
  font-weight: 600;
}

.ptm-attention__metric-value--zero {
  opacity: 0.45;
}

.ptm-attention__row:last-child {
  margin-bottom: 2px;
}

@media (max-width: 720px) {
  .ptm-attention__row,
  .ptm-attention__row--invite {
    grid-template-columns: 30px minmax(0, 1fr) auto;
  }

  .ptm-attention__raw,
  .ptm-attention__row .v-icon {
    display: none;
  }
}
</style>
