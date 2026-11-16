<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue'

const props = defineProps({
  initialConfig: { type: Object, default: () => ({}) },
  api: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: 'QingwaBonus' },
  sourcePluginId: { type: String, default: '' },
  nativeSubscribe: { type: Function, default: null },
})

const emit = defineEmits(['layout', 'save', 'close', 'switch'])

const form = reactive({
  enabled: false,
  site_name: '青蛙',
  item_bonus: true,
  item_bonus_amount: 1,
  item_upload: false,
  item_upload_amount: 1,
  item_download: false,
  item_download_amount: 1,
  start_time: '09:00',
  end_time: '10:00',
  notify_enabled: true,
  notify_on_error: true,
  retry_enabled: true,
  retry_interval: 5,
  retry_max: 3,
})

const GOODS = [
  { key: 'bonus', label: '每日福利：1000蝌蚪', keyword: '每日福利', icon: 'mdi-gift-outline' },
  { key: 'upload', label: '10.0 GB 上传量', keyword: '上传量', icon: 'mdi-upload-outline' },
  { key: 'download', label: '10.0 GB 下载量', keyword: '下载量', icon: 'mdi-download-outline' },
]

const items = ref([])
const loadingItems = ref(false)
const loadingPrices = ref(true)

function applyConfig(config) {
  if (!config || typeof config !== 'object') return
  for (const key of Object.keys(form)) {
    if (config[key] !== undefined && config[key] !== null) form[key] = config[key]
  }
}

applyConfig(props.initialConfig)
watch(() => props.initialConfig, value => applyConfig(value), { deep: true })

function unwrap(response) {
  if (response && response.data !== undefined) return response.data
  return response
}

function priceText(item) {
  if (!item) return null
  if (item.a_type === 'bonus') return `${Number(item.a_amount).toLocaleString('en-US')} 蝌蚪`
  if (item.a_type === 'invites') return `${item.a_amount} 个永久邀请`
  if (item.a_type === 'attendance_card') return `${item.a_amount} 张补签卡`
  return String(item.a_amount)
}

const goodsRows = computed(() =>
  GOODS.map(g => {
    const item = (items.value || []).find(it => String(it?.name || '').includes(g.keyword))
    return {
      ...g,
      price: priceText(item),
      limit: Number(item?.limit_amount || 0),
      itemId: item?.id ?? null,
    }
  })
)

function maxAmount(row) {
  return row.limit > 0 ? row.limit : 999
}

function onKey(key) {
  return `item_${key}`
}

function amountKey(key) {
  return `item_${key}_amount`
}

function inc(row) {
  const max = maxAmount(row)
  const cur = Number(form[amountKey(row.key)] || 1)
  form[amountKey(row.key)] = Math.min(cur + 1, max)
}

function dec(row) {
  const cur = Number(form[amountKey(row.key)] || 1)
  form[amountKey(row.key)] = Math.max(cur - 1, 1)
}

async function loadItems() {
  loadingPrices.value = true
  loadingItems.value = true
  try {
    const response = unwrap(await props.api.get(`plugin/${props.pluginId}/items`, { feedback: 'silent' }))
    if (response?.success) items.value = response.items || []
  } catch (err) {
    items.value = []
  } finally {
    loadingItems.value = false
    loadingPrices.value = false
  }
}

const enabledCount = computed(
  () => GOODS.filter(g => form[onKey(g.key)]).length
)

function onSave() {
  const data = { ...form }
  for (const row of goodsRows.value) {
    const max = maxAmount(row)
    const cur = Number(data[amountKey(row.key)] || 1)
    data[amountKey(row.key)] = Math.max(1, Math.min(cur, max))
  }
  emit('save', data)
}

function onClose() {
  emit('close')
}

onMounted(async () => {
  emit('layout', { maxWidth: '58rem' })
  await loadItems()
})
</script>

<template>
  <v-card flat>
    <v-card-title class="d-flex align-center flex-wrap ga-2 pt-4 pb-3">
      <v-icon color="success" class="mr-2">mdi-frog</v-icon>
      <span class="text-h6">青蛙蝌蚪福利</span>
      <v-chip size="small" variant="tonal" color="secondary">自动定时购买</v-chip>
      <v-spacer />
      <v-btn icon variant="text" size="small" title="关闭" @click="onClose">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </v-card-title>

    <v-card-text class="pt-0">
      <v-alert type="info" variant="tonal" density="compact" class="mb-4 text-caption">
        本页设置<strong>每天自动购买</strong>哪些商品。只想临时买一次，请在插件详情页使用「手动购买」。
      </v-alert>

      <!-- 自动定时购买总开关 -->
      <v-card variant="outlined" class="mb-4 pa-3" rounded="lg">
        <div class="d-flex align-center">
          <v-icon :color="form.enabled ? 'success' : 'grey'" class="mr-2">mdi-clock-outline</v-icon>
          <div class="flex-grow-1">
            <div class="text-body-2 font-weight-medium">自动定时购买</div>
            <div class="text-caption text-medium-emphasis">
              {{ form.enabled ? `已启用，每日 ${form.start_time}–${form.end_time} 内随机时刻执行` : '未启用，不会自动购买' }}
            </div>
          </div>
          <v-switch v-model="form.enabled" color="success" hide-details inset class="flex-grow-0" />
        </div>
      </v-card>

      <!-- 参与自动购买的商品 -->
      <div class="d-flex align-center mb-2">
        <span class="text-subtitle-2">参与自动购买的商品</span>
        <v-spacer />
        <v-chip v-if="form.enabled" size="x-small" variant="tonal" color="success">
          已选 {{ enabledCount }} 项
        </v-chip>
      </div>

      <v-row dense>
        <v-col v-for="row in goodsRows" :key="row.key" cols="12" md="4">
          <v-card
            variant="outlined"
            rounded="lg"
            class="pa-3 h-100"
            :class="form[onKey(row.key)] ? 'border-success' : ''"
            :style="form[onKey(row.key)] ? 'border-color: rgb(var(--v-theme-success));' : ''"
          >
            <div class="d-flex align-start mb-2">
              <v-icon size="small" :color="form[onKey(row.key)] ? 'success' : 'grey'" class="mr-2">
                {{ row.icon }}
              </v-icon>
              <div class="flex-grow-1 text-truncate">
                <div class="text-body-2 font-weight-medium">{{ row.label }}</div>
                <div class="text-caption text-medium-emphasis">
                  <template v-if="loadingPrices">价格读取中…</template>
                  <template v-else-if="row.price">单价 {{ row.price }}</template>
                  <template v-else>未读取到价格</template>
                </div>
              </div>
              <v-switch
                v-model="form[onKey(row.key)]"
                color="success"
                hide-details
                inset
                density="compact"
                class="flex-grow-0 mt-n1"
              />
            </div>

            <div class="d-flex align-center ga-2">
              <span class="text-caption text-medium-emphasis">数量</span>
              <v-btn
                icon size="x-small" variant="tonal"
                :disabled="!form[onKey(row.key)] || form[amountKey(row.key)] <= 1"
                @click="dec(row)"
              ><v-icon size="small">mdi-minus</v-icon></v-btn>
              <span class="text-body-2 text-center" style="min-width: 2rem">
                {{ form[amountKey(row.key)] || 1 }}
              </span>
              <v-btn
                icon size="x-small" variant="tonal"
                :disabled="!form[onKey(row.key)] || form[amountKey(row.key)] >= maxAmount(row)"
                @click="inc(row)"
              ><v-icon size="small">mdi-plus</v-icon></v-btn>
              <v-spacer />
              <v-chip size="x-small" variant="tonal" :color="row.limit > 0 ? 'warning' : 'secondary'">
                {{ row.limit > 0 ? `限购 ${row.limit}` : '不限购' }}
              </v-chip>
            </div>
          </v-card>
        </v-col>
      </v-row>

      <v-divider class="my-4" />

      <!-- 执行时间段 -->
      <div class="text-subtitle-2 mb-2 d-flex align-center">
        <v-icon size="small" class="mr-1">mdi-clock-outline</v-icon>执行时间段
      </div>
      <v-row dense>
        <v-col cols="6" sm="6">
          <v-text-field
            v-model="form.start_time" type="time" label="开始时间"
            variant="outlined" density="comfortable" hide-details
          />
        </v-col>
        <v-col cols="6" sm="6">
          <v-text-field
            v-model="form.end_time" type="time" label="结束时间"
            variant="outlined" density="comfortable" hide-details
          />
        </v-col>
        <v-col cols="12">
          <div class="text-caption text-medium-emphasis mt-1">
            每天在该区间随机选一个时刻执行，保存后立即重新生成。可在详情页查看下次执行时间。
          </div>
        </v-col>
      </v-row>

      <v-divider class="my-4" />

      <!-- 失败自动重试 -->
      <div class="text-subtitle-2 mb-2 d-flex align-center">
        <v-icon size="small" class="mr-1">mdi-restart-alert</v-icon>失败自动重试
      </div>
      <v-card variant="outlined" rounded="lg" class="pa-3">
        <div class="d-flex align-center">
          <v-icon :color="form.retry_enabled ? 'success' : 'grey'" class="mr-2">mdi-refresh</v-icon>
          <div class="flex-grow-1">
            <div class="text-body-2 font-weight-medium">购买失败后自动重试</div>
            <div class="text-caption text-medium-emphasis">
              仅在配置的时间段内重试，超出时间段或达到次数上限后不再重试
            </div>
          </div>
          <v-switch v-model="form.retry_enabled" color="success" hide-details inset class="flex-grow-0" />
        </div>
        <v-row dense class="mt-1">
          <v-col cols="6">
            <v-text-field
              v-model.number="form.retry_interval" type="number" min="1" max="120"
              :disabled="!form.retry_enabled" label="重试间隔（分钟）"
              variant="outlined" density="comfortable" hide-details
            />
          </v-col>
          <v-col cols="6">
            <v-text-field
              v-model.number="form.retry_max" type="number" min="1" max="20"
              :disabled="!form.retry_enabled" label="最多重试次数"
              variant="outlined" density="comfortable" hide-details
            />
          </v-col>
        </v-row>
      </v-card>

      <v-divider class="my-4" />

      <!-- 通知与其他 -->
      <div class="text-subtitle-2 mb-2 d-flex align-center">
        <v-icon size="small" class="mr-1">mdi-bell-outline</v-icon>通知与其他
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
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="form.site_name" label="站点名称"
            variant="outlined" density="comfortable" hide-details
          />
        </v-col>
      </v-row>
    </v-card-text>

    <v-card-actions class="px-4 pb-4">
      <v-spacer />
      <v-btn variant="text" @click="onClose">关闭</v-btn>
      <v-btn color="success" variant="flat" @click="onSave">保存</v-btn>
    </v-card-actions>
  </v-card>
</template>
