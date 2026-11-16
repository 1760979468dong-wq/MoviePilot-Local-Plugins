<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { unwrapResponse } from '../utils'

const props = defineProps({
  api: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: 'PTManager' },
  initialSettings: { type: Object, default: () => ({}) },
  hostManagedConfig: { type: Boolean, default: false },
})

const emit = defineEmits(['save', 'saved', 'close', 'switch', 'message'])

const pluginBase = computed(() => `plugin/${props.pluginId}`)
const form = ref({})
const siteOptions = ref([])
const saving = ref(false)

const defaults = {
  enabled: false,
  collect_enabled: false,
  collect_mode: 'custom',
  collect_cron: '0 7 * * *',
  collect_timeout: 25,
  collect_concurrency: 4,
  trend_days: 30,
  collect_domains: [],
  notify_enabled: false,
  notify_cron: '0 9 * * *',
  refresh_before_collect: true,
  site_order: [],
  overview_view: 'table',
  wealthy_retirement_sites: [],
  custom_retirement_rules: [],
}

/** 用给定设置重置表单。 */
function reset(source) {
  form.value = { ...defaults, ...(source || {}) }
  form.value.collect_domains = [...(form.value.collect_domains || [])]
  form.value.wealthy_retirement_sites = [...(form.value.wealthy_retirement_sites || [])]
  form.value.custom_retirement_rules = [...(form.value.custom_retirement_rules || [])]
}

/** 读取站点选项，供采集范围选择使用。 */
async function loadOptions() {
  try {
    const data = unwrapResponse(await props.api.get(`${pluginBase.value}/settings`, { feedback: 'silent' }))
    if (data?.site_options) siteOptions.value = data.site_options
    if (!props.hostManagedConfig && data?.settings) reset(data.settings)
  } catch (error) {
    emit('message', { text: `读取设置失败：${error.message}`, color: 'error' })
  }
}

/** 保存设置：宿主管理配置时交由宿主保存，否则调用插件 API。 */
async function submit() {
  saving.value = true
  try {
    const payload = { ...form.value }
    if (props.hostManagedConfig) {
      emit('save', payload)
      emit('message', { text: '设置已提交', color: 'success' })
      return
    }
    const data = unwrapResponse(await props.api.post(`${pluginBase.value}/settings`, payload))
    if (data?.settings) reset(data.settings)
    emit('saved', payload)
    emit('message', { text: '设置已保存', color: 'success' })
  } catch (error) {
    emit('message', { text: `保存失败：${error.message}`, color: 'error' })
  } finally {
    saving.value = false
  }
}

watch(() => props.initialSettings, value => reset(value), { deep: true })
onMounted(async () => {
  reset(props.initialSettings)
  await loadOptions()
})

const siteItems = computed(() =>
  siteOptions.value.map(item => ({
    title: `${item.name || item.domain}${item.has_cookie ? '' : '（无 Cookie）'}`,
    value: item.domain,
    props: { disabled: !item.has_cookie },
  })),
)

/** 可按站点 ID、域名或站点名标记富贵养老，供用户直接勾选。 */
const wealthySiteItems = computed(() =>
  siteOptions.value.map(item => ({
    title: `${item.name || item.domain}（${item.domain}）`,
    value: String(item.domain || item.name || ''),
  })),
)

const wealthyRuleCount = computed(() => (form.value.custom_retirement_rules || []).length)

// 「全选」在下拉列表中的哨兵值，避免与真实域名冲突
const SELECT_ALL = '__all__'

/** 下拉选项：首项为全选，其后是各站点。 */
const collectScopeItems = computed(() => [
  { title: '全选', value: SELECT_ALL },
  ...siteItems.value,
])

/**
 * 采集范围的双向绑定代理。
 *
 * 站点列表为空在配置语义里表示「全部站点」，对应下拉中的「全选」。
 * 勾/取消全选时清空站点列表；单独挑选站点时自动去掉全选标记。
 */
const collectScope = computed({
  get: () => {
    const domains = form.value.collect_domains || []
    return domains.length ? [...domains] : [SELECT_ALL]
  },
  set: values => {
    const list = Array.isArray(values) ? values : []
    const picked = list.filter(item => item !== SELECT_ALL)
    // 勾了全选，或把站点全部取消，都归为「全部站点」
    form.value.collect_domains = list.includes(SELECT_ALL) ? [] : picked
  },
})

/** 抓取时机选项。 */
const collectModeItems = [
  { title: '自定义（按下方 Cron 计划）', value: 'custom' },
  { title: '跟随 MoviePilot 站点数据刷新', value: 'follow_mp' },
]

/** 总览视图选项。 */
const overviewViewItems = [
  { title: '表格', value: 'table' },
  { title: '卡片', value: 'cards' },
]
</script>

<template>
  <div class="ptm-settings">
    <VCard class="ptm-settings__intro" rounded="lg" variant="tonal" color="primary">
      <VCardText class="text-body-2">
        基础数据（上传、下载、分享率、魔力、做种等）来自 MoviePilot 已采集的站点数据，无需额外配置。
        深度采集会使用站点 Cookie 访问 <code>userdetails.php</code>，补齐 UID、邀请人、邀请名额、H&amp;R、
        认领、做种积分、时魔等字段。
      </VCardText>
    </VCard>

    <div class="ptm-settings__grid">
    <div class="ptm-settings__col">
    <VCard rounded="lg" variant="outlined">
      <VCardTitle class="text-subtitle-1">运行设置</VCardTitle>
      <VCardText class="d-flex flex-column ga-3">
        <VSwitch v-model="form.enabled" color="primary" label="启用插件" hide-details />
        <div class="ptm-settings__pair">
          <VTextField
            v-model.number="form.trend_days"
            type="number"
            min="7"
            max="365"
            label="趋势展示天数"
            hint="详情页趋势图展示的历史天数"
            persistent-hint
          />
          <VSelect
            v-model="form.overview_view"
            :items="overviewViewItems"
            label="总览视图"
            hint="总览页站点的呈现方式"
            persistent-hint
          />
        </div>
      </VCardText>
    </VCard>

    <VCard rounded="lg" variant="outlined">
      <VCardTitle class="text-subtitle-1">采集站点范围</VCardTitle>
      <VCardText>
        <!-- 下拉首项即「全选」：勾选后表示采集全部站点，方框内只显示「全选」 -->
        <VSelect
          v-model="collectScope"
          :items="collectScopeItems"
          hide-details
          multiple
          chips
          closable-chips
          :menu-props="{ maxHeight: 420 }"
        />
      </VCardText>
    </VCard>
    </div>

    <VCard rounded="lg" variant="outlined">
      <VCardTitle class="text-subtitle-1">站点页面深度采集</VCardTitle>
      <VCardText class="d-flex flex-column ga-3">
        <VSwitch
          v-model="form.collect_enabled"
          color="primary"
          label="启用定时采集"
          hide-details
        />
        <VSelect
          v-model="form.collect_mode"
          :items="collectModeItems"
          label="抓取时机"
          hint="跟随 MP 会按 MoviePilot 的站点数据刷新间隔自动同频采集"
          persistent-hint
          :disabled="!form.collect_enabled"
        />
        <VTextField
          v-if="form.collect_mode === 'custom'"
          v-model="form.collect_cron"
          label="采集计划（五段式 Cron）"
          hint="例如 0 7 * * * 表示每天 07:00 采集一次"
          persistent-hint
          :disabled="!form.collect_enabled"
        />
        <VAlert v-else type="info" variant="tonal" density="compact">
          跟随 MoviePilot：宿主每次刷新站点数据后，同步抓取 UID、邀请、H&amp;R 等页面扩展字段。
        </VAlert>
        <div class="d-flex flex-wrap ga-3">
          <VTextField
            v-model.number="form.collect_timeout"
            type="number"
            min="5"
            max="120"
            label="单站超时（秒）"
            class="ptm-settings__number"
          />
          <VTextField
            v-model.number="form.collect_concurrency"
            type="number"
            min="1"
            max="8"
            label="采集并发数"
            class="ptm-settings__number"
          />
        </div>
        <VSwitch
          v-model="form.notify_enabled"
          color="primary"
          label="按计划发送采集结果通知"
          hide-details
        />
        <VTextField
          v-if="form.notify_enabled"
          v-model="form.notify_cron"
          label="通知计划（五段式 Cron）"
          hint="默认 0 9 * * * 表示每天 09:00 发送一次，与采集频率无关"
          persistent-hint
        />
        <VSwitch
          v-model="form.refresh_before_collect"
          color="primary"
          label="采集前刷新 MoviePilot 站点数据"
          hint="开启后先让 MoviePilot 重新抓取上传/下载/魔力等基础数据，数值最新但整体耗时较长；关闭则只抓扩展字段，速度快"
          persistent-hint
        />
      </VCardText>
    </VCard>

    <VCard rounded="lg" variant="outlined">
      <VCardTitle class="text-subtitle-1">养老进度</VCardTitle>
      <VCardText class="d-flex flex-column ga-3">
        <VSelect
          v-model="form.wealthy_retirement_sites"
          :items="wealthySiteItems"
          label="富贵养老站点"
          hint="手动标记已达成富贵养老的站点（无需等级门槛），按域名或站点名匹配"
          persistent-hint
          multiple
          chips
          closable-chips
        />
        <div class="ptm-settings__rules">
          <span class="text-caption text-medium-emphasis">
            自定义等级规则 {{ wealthyRuleCount }} 条（用于修正站点等级门槛）
          </span>
        </div>
      </VCardText>
    </VCard>
    </div>

    <div class="ptm-settings__actions">
      <VBtn color="primary" :loading="saving" prepend-icon="mdi-content-save" @click="submit">保存设置</VBtn>
      <VBtn v-if="$attrs.showClose" variant="text" prepend-icon="mdi-close" @click="emit('close')">关闭</VBtn>
    </div>
  </div>
</template>

<style scoped>
.ptm-settings {
  display: flex;
  flex-direction: column;
  gap: 14px;
  /* 左右内缩，避免卡片紧贴外层边框 */
  padding: 0 12px 12px;
}

/* 两列布局：左列（运行设置 + 采集站点范围）与右列（深度采集）并排 */
.ptm-settings__grid {
  display: grid;
  gap: 14px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

/* 左列内部纵向堆叠两个卡片 */
.ptm-settings__col {
  display: flex;
  flex-direction: column;
  gap: 14px;
  min-width: 0;
}

/* 养老进度占满整行 */
.ptm-settings__grid > :last-child {
  grid-column: 1 / -1;
}

/* 窄屏时左列也要跨满整行 */
@media (max-width: 900px) {
  .ptm-settings__col {
    grid-column: 1 / -1;
  }
}

@media (max-width: 900px) {
  .ptm-settings__grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.ptm-settings__intro {
  margin-top: 4px;
}

/* 保存按钮右对齐，并与卡片右边界保持间距 */
.ptm-settings__actions {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  padding: 2px 2px 0;
}

.ptm-settings__number {
  max-width: 200px;
}


/* 并排两个字段，节省纵向空间 */
.ptm-settings__pair {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

@media (max-width: 1500px) {
  .ptm-settings__pair {
    grid-template-columns: minmax(0, 1fr);
  }
}

.ptm-settings__rules {
  align-items: center;
  display: flex;
  min-height: 20px;
}
</style>
