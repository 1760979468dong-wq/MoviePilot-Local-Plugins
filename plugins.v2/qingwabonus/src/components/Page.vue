<script setup>
import { computed, onMounted, reactive, ref } from 'vue'

const props = defineProps({
  api: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: 'QingwaBonus' },
  sourcePluginId: { type: String, default: '' },
})

const emit = defineEmits(['action', 'switch', 'close', 'layout'])

const latest = ref(null)
const liveBalance = ref(null)
const balanceLoading = ref(true)
const items = ref([])
const cachedAt = ref(null)
const loading = ref(true)
const refreshing = ref(false)
const saving = ref(false)
const message = ref('')
const messageType = ref('info')
const buyingId = ref(null)
const amounts = ref({})

const GOODS = [
  { key: 'bonus', keyword: '每日福利', label: '每日福利：1000蝌蚪', icon: 'mdi-gift-outline' },
  { key: 'upload', keyword: '上传量', label: '10.0 GB 上传量', icon: 'mdi-upload-outline' },
  { key: 'download', keyword: '下载量', label: '10.0 GB 下载量', icon: 'mdi-download-outline' },
]

// 与后端配置字段保持一致
const form = reactive({
  enabled: false,
  site_name: '青蛙',
  start_time: '09:00',
  end_time: '10:00',
  notify_enabled: true,
  notify_on_error: true,
  retry_enabled: true,
  retry_interval: 5,
  retry_max: 3,
  item_bonus: true,
  item_bonus_amount: 1,
  item_upload: false,
  item_upload_amount: 1,
  item_download: false,
  item_download_amount: 1,
})

function unwrap(response) {
  if (response && response.data !== undefined) return response.data
  return response
}

function priceText(item) {
  if (!item) return ''
  if (item.a_type === 'bonus') return `${Number(item.a_amount).toLocaleString('en-US')} 蝌蚪`
  if (item.a_type === 'invites') return `${item.a_amount} 个永久邀请`
  if (item.a_type === 'attendance_card') return `${item.a_amount} 张补签卡`
  return String(item.a_amount)
}

const manualItems = computed(() => {
  const list = items.value || []
  return GOODS.map(g => {
    const item = list.find(it => String(it?.name || '').includes(g.keyword))
    if (!item) return null
    return {
      id: item.id,
      name: item.name,
      icon: g.icon,
      price: priceText(item),
      stock: item.stock,
      limit: Number(item.limit_amount || 0),
    }
  }).filter(Boolean)
})

const goodsRows = computed(() => {
  const list = items.value || []
  return GOODS.map(g => {
    const item = list.find(it => String(it?.name || '').includes(g.keyword))
    return {
      ...g,
      price: priceText(item),
      limit: Number(item?.limit_amount || 0),
      stock: item?.stock,
    }
  })
})

const enabledGoodsCount = computed(() => GOODS.filter(g => form[onKey(g.key)]).length)

const cachedText = computed(() => {
  if (!cachedAt.value) return '未知'
  return new Date(cachedAt.value * 1000).toLocaleString('zh-CN', { hour12: false })
})

const nextPlanText = computed(() => {
  if (!form.enabled) return '未启用自动购买'
  return latest.value?.next_plan || '待生成'
})

function onKey(key) {
  return `item_${key}`
}

function amountKey(key) {
  return `item_${key}_amount`
}

function isAuto(name) {
  const map = { '每日福利': 'item_bonus', '上传量': 'item_upload', '下载量': 'item_download' }
  const found = Object.entries(map).find(([k]) => String(name || '').includes(k))
  return found ? !!form[found[1]] : false
}

function maxAuto(row) {
  return row.limit > 0 ? row.limit : 999
}

function incAuto(row) {
  const cur = Number(form[amountKey(row.key)] || 1)
  form[amountKey(row.key)] = Math.min(cur + 1, maxAuto(row))
}

function decAuto(row) {
  const cur = Number(form[amountKey(row.key)] || 1)
  form[amountKey(row.key)] = Math.max(cur - 1, 1)
}

function amountOf(item) {
  const v = amounts.value[item.id]
  return v !== undefined && v !== null ? v : 1
}

function maxOf(item) {
  return item.limit > 0 ? item.limit : 999
}

function setAmount(item, value) {
  let n = Number(value)
  if (Number.isNaN(n) || n < 1) n = 1
  amounts.value = { ...amounts.value, [item.id]: Math.min(n, maxOf(item)) }
}

function incAmount(item) {
  setAmount(item, Math.min(amountOf(item) + 1, maxOf(item)))
}

function decAmount(item) {
  setAmount(item, Math.max(amountOf(item) - 1, 1))
}

async function loadConfig() {
  try {
    const response = unwrap(await props.api.get(`plugin/${props.pluginId}/config`, { feedback: 'silent' }))
    if (response && typeof response === 'object') {
      for (const key of Object.keys(form)) {
        if (response[key] !== undefined && response[key] !== null) form[key] = response[key]
      }
    }
  } catch (err) {
    // 保留默认值
  }
}

async function loadLatest() {
  try {
    const response = unwrap(await props.api.get(`plugin/${props.pluginId}/latest`, { feedback: 'silent' }))
    latest.value = response || null
  } catch (err) {
    latest.value = null
  }
}

async function loadItems(force = false) {
  const url = force ? `plugin/${props.pluginId}/items?refresh=1` : `plugin/${props.pluginId}/items`
  try {
    const response = unwrap(await props.api.get(url, { feedback: 'silent' }))
    if (response?.success) {
      items.value = response.items || []
      cachedAt.value = response.cached_at || null
    }
  } catch (err) {
    items.value = []
  }
}

async function refreshBalance() {
  try {
    const response = unwrap(await props.api.get(`plugin/${props.pluginId}/balance`, { feedback: 'silent' }))
    if (response?.balance) liveBalance.value = response.balance
  } catch (err) {
    // 忽略：保留上一次已知余额
  } finally {
    balanceLoading.value = false
  }
}

async function refreshItems() {
  refreshing.value = true
  await Promise.all([loadItems(true), loadLatest(), refreshBalance()])
  refreshing.value = false
}

async function saveConfig() {
  saving.value = true
  message.value = ''
  try {
    const payload = { ...form }
    for (const row of goodsRows.value) {
      const max = maxAuto(row)
      const cur = Number(payload[amountKey(row.key)] || 1)
      payload[amountKey(row.key)] = Math.max(1, Math.min(cur, max))
    }
    const response = unwrap(await props.api.post(`plugin/${props.pluginId}/config`, payload))
    if (response?.success) {
      messageType.value = 'success'
      message.value = '自动购买设置已保存并生效'
      await Promise.all([loadConfig(), loadLatest()])
    } else {
      messageType.value = 'error'
      message.value = response?.message || '保存失败'
    }
  } catch (err) {
    messageType.value = 'error'
    message.value = '保存失败'
  } finally {
    saving.value = false
  }
}

async function buyNow(item) {
  const amount = Math.max(1, Math.min(Number(amountOf(item)) || 1, maxOf(item)))
  buyingId.value = item.id
  message.value = ''
  try {
    const response = unwrap(await props.api.post(`plugin/${props.pluginId}/buy`,
      { item_id: item.id, amount }))
    const state = response?.state || (response?.success ? '购买成功' : '失败')
    messageType.value = response?.success ? 'success' : 'error'
    message.value = `${item.name}：${state}。${response?.message || ''}`
    await loadItems(true)
    await loadLatest()
    if (response?.balance) liveBalance.value = response.balance
    await refreshBalance()
  } catch (err) {
    messageType.value = 'error'
    message.value = `${item.name}：购买请求失败`
  } finally {
    buyingId.value = null
  }
}

async function runAuto() {
  buyingId.value = 'auto'
  message.value = ''
  try {
    const response = unwrap(await props.api.post(`plugin/${props.pluginId}/run`))
    const ok = response?.success
    messageType.value = ok ? 'success' : 'error'
    message.value = ok ? `自动购买完成：${response?.summary || ''}` : `自动购买失败：${response?.message || ''}`
    await loadItems(true)
    await loadLatest()
    if (response?.balance) liveBalance.value = response.balance
    await refreshBalance()
  } catch (err) {
    messageType.value = 'error'
    message.value = '触发失败'
  } finally {
    buyingId.value = null
  }
}

function resultColor(r) {
  if (!r.success) return 'error'
  return r.skipped ? 'info' : 'success'
}

function resultText(r) {
  if (!r.success) return '失败'
  return r.skipped ? '已购买过' : '购买成功'
}

function rowColor(r) {
  if (!r.success) return 'error'
  return r.skipped ? 'info' : 'success'
}

// 最近购买明细：手动与自动统一展示，旧的仅有 results 的数据做兼容回退
const historyRows = computed(() => {
  const list = latest.value?.history
  if (Array.isArray(list) && list.length) return list
  const results = latest.value?.results
  if (!Array.isArray(results)) return []
  return results.map(r => ({
    name: r.name,
    amount: r.amount,
    state: resultText(r),
    success: r.success,
    skipped: r.skipped,
    message: r.message,
    source: '自动',
    time: latest.value?.time,
  }))
})

function onClose() {
  emit('close')
}

onMounted(async () => {
  emit('layout', { maxWidth: '58rem' })
  await Promise.all([loadConfig(), loadLatest(), loadItems(), refreshBalance()])
  loading.value = false
})
</script>

<template>
  <v-card flat>
    <v-card-title class="d-flex align-center pt-4 pb-3">
      <v-icon color="success" class="mr-2">mdi-frog</v-icon>
      <span class="text-h6">青蛙蝌蚪福利</span>
      <v-spacer />
      <v-btn icon variant="text" size="small" title="关闭" @click="onClose">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </v-card-title>

    <v-card-text class="pt-0">
      <v-alert v-if="message" :type="messageType" variant="tonal" density="comfortable" class="mb-4">
        {{ message }}
      </v-alert>

      <!-- 概览 -->
      <v-row dense class="mb-1">
        <v-col cols="6" sm="3">
          <div class="text-caption text-medium-emphasis">账户余额</div>
          <div class="text-body-2 font-weight-medium">
            {{ liveBalance ?? (balanceLoading ? '读取中…' : '—') }}
          </div>
        </v-col>
        <v-col cols="6" sm="3">
          <div class="text-caption text-medium-emphasis">下次自动购买</div>
          <div class="text-body-2 font-weight-medium">{{ nextPlanText }}</div>
        </v-col>
        <v-col cols="6" sm="3">
          <div class="text-caption text-medium-emphasis">最近时间</div>
          <div class="text-body-2 font-weight-medium">{{ latest?.time || '-' }}</div>
        </v-col>
        <v-col cols="6" sm="3">
          <div class="text-caption text-medium-emphasis">站点</div>
          <div class="text-body-2 font-weight-medium">{{ latest?.site || '-' }}</div>
        </v-col>
      </v-row>

      <v-divider class="my-3" />

      <!-- 手动购买 -->
      <div class="d-flex align-center mb-2">
        <v-chip size="small" variant="tonal" color="primary" class="mr-2">
          <v-icon start size="x-small">mdi-cart-outline</v-icon>手动购买
        </v-chip>
        <span class="text-caption text-medium-emphasis">立即买一次，不影响每日自动任务</span>
        <v-spacer />
        <v-btn size="x-small" variant="text" :loading="refreshing" @click="refreshItems">刷新</v-btn>
      </div>

      <div v-if="loading" class="text-body-2 text-medium-emphasis">加载中…</div>
      <v-row v-else dense>
        <v-col v-for="item in manualItems" :key="item.id" cols="12" md="4">
          <v-card variant="outlined" rounded="lg" class="pa-3 h-100">
            <div class="d-flex align-start mb-2">
              <v-icon size="small" color="primary" class="mr-2">{{ item.icon }}</v-icon>
              <div class="flex-grow-1">
                <div class="text-body-2 font-weight-medium">{{ item.name }}</div>
                <div class="text-caption text-medium-emphasis">
                  {{ item.price }} · 库存 {{ item.stock }}
                  <span v-if="item.limit > 0"> · 限购 {{ item.limit }}</span>
                </div>
              </div>
              <v-chip v-if="isAuto(item.name)" size="x-small" variant="tonal" color="success">
                自动
              </v-chip>
            </div>

            <div class="d-flex align-center ga-2">
              <v-btn
                icon size="x-small" variant="tonal"
                :disabled="amountOf(item) <= 1" @click="decAmount(item)"
              ><v-icon size="small">mdi-minus</v-icon></v-btn>
              <v-text-field
                :model-value="amountOf(item)"
                @update:model-value="v => setAmount(item, v)"
                type="number" min="1" :max="maxOf(item)"
                variant="outlined" density="compact" hide-details
                style="max-width: 4.5rem"
              />
              <v-btn
                icon size="x-small" variant="tonal"
                :disabled="amountOf(item) >= maxOf(item)" @click="incAmount(item)"
              ><v-icon size="small">mdi-plus</v-icon></v-btn>
              <v-spacer />
              <v-btn
                color="primary" variant="flat" size="small"
                :loading="buyingId === item.id" @click="buyNow(item)"
              >购买</v-btn>
            </div>
          </v-card>
        </v-col>
      </v-row>
      <div v-if="!loading && !manualItems.length" class="text-body-2 text-medium-emphasis">
        未能读取商品列表，请点刷新重试
      </div>

      <div class="text-caption text-medium-emphasis mt-2">
        商品数据更新时间：{{ cachedText }}
      </div>

      <v-divider class="my-4" />

      <!-- 自动定时购买（可直接在此配置） -->
      <div class="d-flex align-center flex-wrap ga-2 mb-2">
        <v-chip size="small" variant="tonal" color="secondary" class="mr-1">
          <v-icon start size="x-small">mdi-clock-outline</v-icon>自动定时购买
        </v-chip>
        <span class="text-caption text-medium-emphasis">
          {{ form.enabled ? `已启用，每日 ${form.start_time}–${form.end_time} 内随机时刻执行` : '未启用' }}
        </span>
        <v-spacer />
        <v-btn
          size="small" variant="outlined" color="secondary"
          :loading="buyingId === 'auto'" @click="runAuto"
        >立即执行一次</v-btn>
        <v-btn
          size="small" variant="flat" color="success"
          :loading="saving" @click="saveConfig"
        >保存设置</v-btn>
      </div>

      <v-card variant="outlined" rounded="lg" class="pa-3 mb-3">
        <!-- 总开关 -->
        <div class="d-flex align-center">
          <v-icon :color="form.enabled ? 'success' : 'grey'" class="mr-2">mdi-power</v-icon>
          <div class="flex-grow-1">
            <div class="text-body-2 font-weight-medium">启用自动定时购买</div>
            <div class="text-caption text-medium-emphasis">关闭后不会自动购买，手动购买不受影响</div>
          </div>
          <v-switch v-model="form.enabled" color="success" hide-details inset class="flex-grow-0" />
        </div>

        <!-- 参与商品 -->
        <div class="d-flex align-center mt-2 mb-1">
          <span class="text-subtitle-2">参与自动购买的商品</span>
          <v-spacer />
          <v-chip v-if="form.enabled" size="x-small" variant="tonal" color="success">
            已选 {{ enabledGoodsCount }} 项
          </v-chip>
        </div>
        <v-row dense>
          <v-col v-for="row in goodsRows" :key="row.key" cols="12" md="4">
            <v-card
              variant="outlined" rounded="lg" class="pa-3 h-100"
              :style="form[onKey(row.key)] ? 'border-color: rgb(var(--v-theme-success));' : ''"
            >
              <div class="d-flex align-start mb-2">
                <v-icon size="small" :color="form[onKey(row.key)] ? 'success' : 'grey'" class="mr-2">
                  {{ row.icon }}
                </v-icon>
                <div class="flex-grow-1 text-truncate">
                  <div class="text-body-2 font-weight-medium">{{ row.label }}</div>
                  <div class="text-caption text-medium-emphasis">
                    <template v-if="row.price">单价 {{ row.price }}</template>
                    <template v-else>未读取到价格</template>
                  </div>
                </div>
                <v-switch
                  v-model="form[onKey(row.key)]"
                  color="success" hide-details inset density="compact"
                  class="flex-grow-0 mt-n1"
                />
              </div>
              <div class="d-flex align-center ga-2">
                <span class="text-caption text-medium-emphasis">数量</span>
                <v-btn
                  icon size="x-small" variant="tonal"
                  :disabled="!form[onKey(row.key)] || form[amountKey(row.key)] <= 1"
                  @click="decAuto(row)"
                ><v-icon size="small">mdi-minus</v-icon></v-btn>
                <span class="text-body-2 text-center" style="min-width: 2rem">
                  {{ form[amountKey(row.key)] || 1 }}
                </span>
                <v-btn
                  icon size="x-small" variant="tonal"
                  :disabled="!form[onKey(row.key)] || form[amountKey(row.key)] >= maxAuto(row)"
                  @click="incAuto(row)"
                ><v-icon size="small">mdi-plus</v-icon></v-btn>
                <v-spacer />
                <v-chip size="x-small" variant="tonal" :color="row.limit > 0 ? 'warning' : 'secondary'">
                  {{ row.limit > 0 ? `限购 ${row.limit}` : '不限购' }}
                </v-chip>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <!-- 时间段 -->
        <div class="text-subtitle-2 mt-3 mb-1 d-flex align-center">
          <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>执行时间段
        </div>
        <v-row dense>
          <v-col cols="6">
            <v-text-field
              v-model="form.start_time" type="time" label="开始时间"
              variant="outlined" density="comfortable" hide-details
            />
          </v-col>
          <v-col cols="6">
            <v-text-field
              v-model="form.end_time" type="time" label="结束时间"
              variant="outlined" density="comfortable" hide-details
            />
          </v-col>
          <v-col cols="12">
            <div class="text-caption text-medium-emphasis mt-1">
              每天在该区间随机选一个时刻执行，保存后立即重新生成。
            </div>
          </v-col>
        </v-row>

        <!-- 通知 -->
        <div class="text-subtitle-2 mt-3 mb-1 d-flex align-center">
          <v-icon size="small" class="mr-1">mdi-bell-outline</v-icon>通知
        </div>
        <v-row dense>
          <v-col cols="12" sm="6">
            <v-switch v-model="form.notify_enabled" color="success" inset hide-details>
              <template #label><span class="text-body-2">购买成功通知</span></template>
            </v-switch>
          </v-col>
          <v-col cols="12" sm="6">
            <v-switch v-model="form.notify_on_error" color="success" inset hide-details>
              <template #label><span class="text-body-2">失败时提醒</span></template>
            </v-switch>
          </v-col>
        </v-row>

        <!-- 失败自动重试 -->
        <div class="text-subtitle-2 mt-3 mb-1 d-flex align-center">
          <v-icon size="small" class="mr-1">mdi-restart-alert</v-icon>失败自动重试
        </div>
        <v-row dense>
          <v-col cols="12" sm="6">
            <v-switch v-model="form.retry_enabled" color="success" inset hide-details>
              <template #label><span class="text-body-2">购买失败后自动重试</span></template>
            </v-switch>
          </v-col>
          <v-col cols="6" sm="3">
            <v-text-field
              v-model.number="form.retry_interval" type="number" min="1" max="120"
              :disabled="!form.retry_enabled" label="间隔（分钟）"
              variant="outlined" density="comfortable" hide-details
            />
          </v-col>
          <v-col cols="6" sm="3">
            <v-text-field
              v-model.number="form.retry_max" type="number" min="1" max="20"
              :disabled="!form.retry_enabled" label="最多次数"
              variant="outlined" density="comfortable" hide-details
            />
          </v-col>
          <v-col cols="12">
            <div class="text-caption text-medium-emphasis">
              仅在配置的时间段内重试，超出时间段或达到次数上限后不再重试。
            </div>
          </v-col>
        </v-row>
      </v-card>

      <div class="text-caption text-medium-emphasis mb-2">最近购买明细（含手动与自动）</div>
      <v-list v-if="historyRows.length" density="compact" class="pa-0">
        <v-list-item v-for="(r, idx) in historyRows" :key="idx" class="px-0">
          <template #prepend>
            <v-chip :color="rowColor(r)" size="x-small" variant="tonal" class="mr-2">
              {{ r.state }}
            </v-chip>
          </template>
          <v-list-item-title class="text-body-2">
            {{ r.name }}<span v-if="r.amount"> · {{ r.amount }} 件</span>
            <v-chip
              size="x-small" variant="text" class="ml-1"
              :color="r.source === '自动' ? 'secondary' : 'primary'"
            >{{ r.source }}</v-chip>
          </v-list-item-title>
          <v-list-item-subtitle class="text-caption">
            {{ r.message }}<span v-if="r.time"> · {{ r.time }}</span>
          </v-list-item-subtitle>
        </v-list-item>
      </v-list>
      <div v-else class="text-body-2 text-medium-emphasis">暂无购买记录</div>
    </v-card-text>

    <v-card-actions class="px-4 pb-4">
      <v-spacer />
      <v-btn variant="text" @click="onClose">关闭</v-btn>
    </v-card-actions>
  </v-card>
</template>
