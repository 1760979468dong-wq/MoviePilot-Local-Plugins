<script setup>
import { computed, onMounted, ref } from 'vue'

const props = defineProps({
  api: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: 'OpenPTNotify' },
  sourcePluginId: { type: String, default: '' },
  nativeSubscribe: { type: Function, default: null },
})

const emit = defineEmits(['action', 'switch', 'close'])

// MoviePilot 主题下 v-card 的 outlined 边框过淡，改用主题变量自绘，明暗主题都清晰
const cardStyle = {
  background: 'rgba(var(--v-theme-on-surface), 0.04)',
  border: '1px solid rgba(var(--v-theme-on-surface), 0.14)',
  borderRadius: '10px',
}

const loading = ref(false)
const running = ref(false)
const result = ref({})
const config = ref({})
const error = ref('')
const filter = ref('all')
const logoFailed = ref({})

function unwrap(response) {
  if (response && response.data !== undefined) return response.data
  return response
}

async function load() {
  loading.value = true
  error.value = ''
  try {
    const response = unwrap(
      await props.api.get(`plugin/${props.pluginId}/latest`, { feedback: 'silent' }),
    )
    result.value = response?.result || {}
    config.value = response?.config || {}
  } catch (err) {
    error.value = err?.message || String(err)
  } finally {
    loading.value = false
  }
}

async function runNow() {
  running.value = true
  error.value = ''
  try {
    const response = unwrap(await props.api.post(`plugin/${props.pluginId}/run`))
    result.value = response?.result || {}
    emit('action')
  } catch (err) {
    error.value = err?.message || String(err)
  } finally {
    running.value = false
  }
}

const sites = computed(() => (Array.isArray(result.value?.sites) ? result.value.sites : []))
const ownedSites = computed(() => sites.value.filter(site => site.owned))
const unownedSites = computed(() => sites.value.filter(site => !site.owned))
const newSites = computed(() => sites.value.filter(site => site.is_new))

const filteredSites = computed(() => {
  if (filter.value === 'owned') return ownedSites.value
  if (filter.value === 'unowned') return unownedSites.value
  if (filter.value === 'new') return newSites.value
  return sites.value
})

const fetchedAt = computed(() => result.value?.fetched_at || '尚未执行')

function toggleFilter(name) {
  filter.value = filter.value === name ? 'all' : name
}

function siteKey(site, index) {
  return `${site.domain || site.name || 'site'}-${index}`
}

function logoKey(site) {
  return site.domain || site.name || ''
}

function markLogoFailed(site) {
  logoFailed.value = { ...logoFailed.value, [logoKey(site)]: true }
}

function initial(site) {
  const text = String(site.name || site.domain || '?').trim()
  return text ? text.charAt(0).toUpperCase() : '?'
}

onMounted(load)
</script>

<template>
  <v-card flat>
    <v-toolbar density="comfortable" color="transparent" flat>
      <v-toolbar-title class="text-h6">PT开注提醒</v-toolbar-title>
      <v-spacer />
      <v-btn
        color="primary"
        variant="tonal"
        size="small"
        :loading="running"
        prepend-icon="mdi-send"
        class="mr-2"
        @click="runNow"
      >
        立即抓取并推送
      </v-btn>
      <v-btn
        icon="mdi-refresh"
        variant="text"
        size="small"
        title="刷新"
        @click="load"
      />
      <v-btn
        icon="mdi-cog-outline"
        variant="text"
        size="small"
        title="设置"
        @click="emit('switch')"
      />
      <v-btn
        icon="mdi-close"
        variant="text"
        size="small"
        title="关闭"
        @click="emit('close')"
      />
    </v-toolbar>

    <v-card-text class="pt-0">
      <div class="d-flex flex-wrap align-center ga-2 mb-1">
        <v-chip
          size="small"
          :color="filter === 'all' ? 'primary' : 'grey'"
          :variant="filter === 'all' ? 'flat' : 'tonal'"
          @click="filter = 'all'"
        >
          全部 {{ sites.length }}
        </v-chip>
        <v-chip
          size="small"
          prepend-icon="mdi-check-circle"
          :color="filter === 'owned' ? 'primary' : 'grey'"
          :variant="filter === 'owned' ? 'flat' : 'tonal'"
          @click="toggleFilter('owned')"
        >
          已拥有 {{ ownedSites.length }}
        </v-chip>
        <v-chip
          size="small"
          prepend-icon="mdi-circle-outline"
          :color="filter === 'unowned' ? 'primary' : 'grey'"
          :variant="filter === 'unowned' ? 'flat' : 'tonal'"
          @click="toggleFilter('unowned')"
        >
          未拥有 {{ unownedSites.length }}
        </v-chip>
        <v-chip
          v-if="newSites.length"
          size="small"
          prepend-icon="mdi-star-plus"
          :color="filter === 'new' ? 'primary' : 'grey'"
          :variant="filter === 'new' ? 'flat' : 'tonal'"
          @click="toggleFilter('new')"
        >
          新增 {{ newSites.length }}
        </v-chip>
        <v-spacer />
        <span class="text-caption text-medium-emphasis">最近抓取：{{ fetchedAt }}</span>
        <v-chip v-if="config?.enabled" size="small" variant="text">
          定时：{{ config.cron }}
        </v-chip>
        <v-chip v-else size="small" color="warning" variant="tonal">插件未启用</v-chip>
      </div>

      <div class="text-caption text-medium-emphasis mb-3">
        是否「已拥有」依据该站点域名是否已在 MoviePilot「站点管理」中配置来判断，可点击上方标签筛选。
      </div>

      <v-alert v-if="error" type="error" variant="tonal" density="comfortable" class="mb-3">
        {{ error }}
      </v-alert>
      <v-alert
        v-if="result?.error"
        type="warning"
        variant="tonal"
        density="comfortable"
        class="mb-3"
      >
        最近一次抓取失败：{{ result.error }}
      </v-alert>

      <v-row v-if="filteredSites.length" dense>
        <v-col
          v-for="(site, index) in filteredSites"
          :key="siteKey(site, index)"
          cols="12"
          sm="6"
          md="4"
          lg="3"
        >
          <v-card class="pa-2 h-100" :style="cardStyle">
            <div class="d-flex align-center ga-2">
              <v-avatar size="34" :color="site.owned ? 'grey' : 'primary'" variant="tonal">
                <img
                  v-if="site.logo && !logoFailed[logoKey(site)]"
                  :src="site.logo"
                  alt=""
                  @error="markLogoFailed(site)"
                />
                <span v-else class="text-body-2">{{ initial(site) }}</span>
              </v-avatar>
              <div class="flex-grow-1" style="min-width: 0">
                <div class="text-body-2 font-weight-medium text-truncate" :title="site.name">
                  {{ site.name }}
                </div>
                <div class="text-caption text-medium-emphasis text-truncate" :title="site.domain">
                  {{ site.domain }}
                </div>
              </div>
              <v-btn
                v-if="site.register_url"
                :href="site.register_url"
                target="_blank"
                rel="noopener"
                icon="mdi-open-in-new"
                size="x-small"
                variant="text"
                color="primary"
                :title="`打开 ${site.name} 注册页`"
              />
            </div>
            <div class="d-flex flex-wrap align-center ga-2 mt-2">
              <v-chip v-if="site.is_new" size="x-small" color="success" variant="tonal">
                新增
              </v-chip>
              <span
                class="text-caption d-inline-flex align-center"
                :class="site.owned ? 'text-success' : 'text-medium-emphasis'"
              >
                <v-icon
                  size="14"
                  class="mr-1"
                  :icon="site.owned ? 'mdi-check-circle' : 'mdi-circle-outline'"
                />
                {{ site.owned ? '已拥有' : '未拥有' }}
              </span>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <v-alert v-else-if="!loading" type="info" variant="tonal" density="comfortable">
        {{
          sites.length
            ? '当前筛选下没有站点，点击上方「全部」查看所有开注站点。'
            : '暂无数据。启用插件后点击「立即抓取并推送」即可获取当前开注站点。'
        }}
      </v-alert>
    </v-card-text>
  </v-card>
</template>
