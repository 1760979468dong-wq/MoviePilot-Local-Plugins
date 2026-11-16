<script setup>
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import SiteAvatar from './SiteAvatar.vue'
import { formatBytes, formatInteger, formatRatio, unwrapResponse } from '../utils'

const props = defineProps({
  api: { type: Object, default: () => ({}) },
  config: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: 'PTManager' },
  sourcePluginId: { type: String, default: '' },
  nativeSubscribe: { type: Function, default: null },
  allowRefresh: { type: Boolean, default: true },
})

const pluginBase = computed(() => `plugin/${props.pluginId || 'PTManager'}`)
const loading = ref(false)
const summary = ref({})
const topSites = ref([])
let refreshTimer = null

/** 读取总览数据并挑出做种体积最大的站点。 */
async function loadOverview() {
  if (!props.allowRefresh && Object.keys(summary.value).length) return
  loading.value = true
  try {
    const data = unwrapResponse(await props.api.get(`${pluginBase.value}/overview`, { feedback: 'silent' }))
    summary.value = data?.summary || {}
    const sites = [...(data?.sites || [])]
    sites.sort((left, right) => Number(right.seeding_size || 0) - Number(left.seeding_size || 0))
    topSites.value = sites.slice(0, 5)
  } catch {
    // 仪表盘加载失败时保持上一次结果
  } finally {
    loading.value = false
  }
}

watch(() => props.allowRefresh, enabled => enabled && loadOverview())

onMounted(() => {
  loadOverview()
  refreshTimer = window.setInterval(loadOverview, 120000)
})

onUnmounted(() => {
  if (refreshTimer) window.clearInterval(refreshTimer)
})
</script>

<template>
  <div class="ptm-dashboard">
    <div class="ptm-dashboard__totals">
      <div>
        <span class="ptm-dashboard__label">上传合计</span>
        <span class="ptm-dashboard__value">{{ formatBytes(summary.upload) }}</span>
      </div>
      <div>
        <span class="ptm-dashboard__label">下载合计</span>
        <span class="ptm-dashboard__value">{{ formatBytes(summary.download) }}</span>
      </div>
      <div>
        <span class="ptm-dashboard__label">分享率</span>
        <span class="ptm-dashboard__value">{{ formatRatio(summary.ratio) }}</span>
      </div>
      <div>
        <span class="ptm-dashboard__label">做种体积</span>
        <span class="ptm-dashboard__value">{{ formatBytes(summary.seeding_size) }}</span>
      </div>
      <div>
        <span class="ptm-dashboard__label">站点数</span>
        <span class="ptm-dashboard__value">{{ formatInteger(summary.site_count) }}</span>
      </div>
    </div>

    <VDivider class="my-2" />

    <div class="ptm-dashboard__list">
      <div v-for="site in topSites" :key="site.domain" class="ptm-dashboard__row">
        <SiteAvatar :api="api" :site="site" :size="26" />
        <span class="ptm-dashboard__name">{{ site.name }}</span>
        <span class="ptm-dashboard__metric">{{ formatBytes(site.seeding_size) }}</span>
        <span class="ptm-dashboard__metric">{{ formatInteger(site.seeding) }} 种</span>
      </div>
      <div v-if="!topSites.length && !loading" class="text-caption text-medium-emphasis">
        暂无站点数据
      </div>
    </div>
  </div>
</template>

<style scoped>
.ptm-dashboard {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.ptm-dashboard__totals {
  display: grid;
  gap: 8px;
  grid-template-columns: repeat(auto-fill, minmax(110px, 1fr));
}

.ptm-dashboard__label {
  display: block;
  font-size: 0.68rem;
  opacity: 0.7;
}

.ptm-dashboard__value {
  font-size: 0.92rem;
  font-weight: 700;
}

.ptm-dashboard__list {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.ptm-dashboard__row {
  align-items: center;
  display: flex;
  gap: 8px;
  min-width: 0;
}

.ptm-dashboard__name {
  flex: 1 1 auto;
  font-size: 0.82rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ptm-dashboard__metric {
  font-size: 0.76rem;
  opacity: 0.8;
  white-space: nowrap;
}
</style>
