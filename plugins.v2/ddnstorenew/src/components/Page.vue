<script setup>
/**
 * 插件详情页：分两层。
 * 第一层「状态」只读展示已保存的配置与实时套餐/域名状态；
 * 第二层「设置」才允许修改配置，避免误改。
 */
import { computed, onMounted, ref } from 'vue'
import SettingsForm from './SettingsForm.vue'

const props = defineProps({
  api: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: 'DdnstoRenew' },
  sourcePluginId: { type: String, default: '' },
})

const emit = defineEmits(['action', 'switch', 'close', 'layout'])

const tab = ref('status')
const status = ref(null)
const loading = ref(true)
const saving = ref(false)
const running = ref(false)
const message = ref('')
const messageType = ref('info')

function unwrap(response) {
  if (response && response.data !== undefined) return response.data
  return response
}

const config = computed(() => status.value?.config || {})
const loggedIn = computed(() => !!status.value?.logged_in)
const devices = computed(() => status.value?.devices || [])
const pendingCount = computed(() => devices.value.filter(d => d.needs_renew).length)
const warnings = computed(() => status.value?.last_result?.warnings || [])
const lastResult = computed(() => status.value?.last_result || null)

const CHECK_LABEL = {
  1: '每 1 小时', 3: '每 3 小时', 6: '每 6 小时', 12: '每 12 小时', 24: '每天 09:00',
}

const summary = computed(() => [
  {
    icon: 'mdi-account-circle-outline',
    label: '登录账号',
    value: status.value?.user?.username || (status.value?.user?.id ?? '未登录'),
  },
  {
    icon: 'mdi-gift-outline',
    label: '免费套餐',
    value: status.value?.product?.name
      ? `${status.value.product.name}（${status.value.product.due_days} 天）`
      : '未读取',
  },
  {
    icon: 'mdi-devices',
    label: '设备 / 待续期',
    value: `${status.value?.device_count ?? 0} 台 / ${pendingCount.value} 台`,
  },
  {
    icon: 'mdi-magnify-scan',
    label: '下次执行检查',
    value: status.value?.next_check || status.value?.next_run || '-',
    sub: '按检查间隔定时检查套餐状态',
  },
  {
    icon: 'mdi-calendar-clock',
    label: '下次执行订阅',
    value: status.value?.next_renew || '-',
    sub: status.value?.next_renew_device
      ? `按「自动续期时机」推算，最早轮到：${status.value.next_renew_device}`
      : '按「自动续期时机」与到期时间推算',
  },
])

// 只读展示已保存的配置
const savedSettings = computed(() => {
  const days = config.value.renew_before_days
  return [
    {
      icon: 'mdi-power',
      label: '自动定时续期',
      value: config.value.enabled ? '已启用' : '已关闭',
      color: config.value.enabled ? 'success' : 'grey',
    },
    {
      icon: 'mdi-timer-outline',
      label: '检查间隔',
      value: CHECK_LABEL[config.value.check_hours] || `每 ${config.value.check_hours} 小时`,
    },
    {
      icon: 'mdi-calendar-clock',
      label: '自动续期时机',
      value: days ? `剩余不足 ${days} 天` : '到期后再领取',
    },
    {
      icon: 'mdi-devices',
      label: '自动续期设备',
      value: config.value.device_ids?.length
        ? `指定 ${config.value.device_ids.length} 台`
        : '全部符合条件的设备',
    },
    {
      icon: 'mdi-bell-outline',
      label: '通知',
      value: [
        config.value.notify_enabled ? '成功通知' : null,
        config.value.notify_on_error ? '失败提醒' : null,
      ].filter(Boolean).join(' / ') || '已关闭',
    },
  ]
})

function deviceColor(device) {
  return device.needs_renew ? 'warning' : 'success'
}

function deviceHint(device) {
  return device.needs_renew ? `需要续期：${device.reason}` : device.reason
}

function remainingText(device) {
  if (device.remaining_days === null || device.remaining_days === undefined) return ''
  return device.remaining_days < 0 ? '已过期' : `剩余 ${device.remaining_days} 天`
}

async function loadStatus() {
  loading.value = true
  try {
    const response = unwrap(await props.api.get(
      `plugin/${props.pluginId}/status`, { feedback: 'silent' },
    ))
    status.value = response || null
  } catch (err) {
    status.value = null
    message.value = err?.message || '状态读取失败'
    messageType.value = 'error'
  } finally {
    loading.value = false
  }
}

async function onSaveConfig(data) {
  saving.value = true
  try {
    const response = unwrap(await props.api.post(
      `plugin/${props.pluginId}/config`, data,
    ))
    if (response?.success === false) {
      message.value = response?.message || '保存失败'
      messageType.value = 'error'
    } else {
      message.value = '设置已保存'
      messageType.value = 'success'
      tab.value = 'status'
    }
  } catch (err) {
    message.value = err?.message || '保存失败'
    messageType.value = 'error'
  } finally {
    saving.value = false
    await loadStatus()
  }
}

async function runRenew() {
  if (running.value) return
  running.value = true
  message.value = ''
  try {
    const response = unwrap(await props.api.post(`plugin/${props.pluginId}/renew`, {}))
    message.value = response?.message || '执行完成'
    messageType.value = response?.success ? 'success' : 'error'
  } catch (err) {
    message.value = err?.message || '执行失败'
    messageType.value = 'error'
  } finally {
    running.value = false
    await loadStatus()
  }
}

function close() {
  emit('close')
}

onMounted(async () => {
  emit('layout', { maxWidth: '64rem' })
  await loadStatus()
})
</script>

<template>
  <v-card flat>
    <v-card-title class="d-flex align-center flex-wrap ga-2 pt-4 pb-2">
      <v-icon color="primary" class="mr-2">mdi-refresh-circle</v-icon>
      <span class="text-h6">DDNSTO 自动续期</span>
      <v-chip size="small" variant="tonal" :color="loggedIn ? 'success' : 'error'">
        {{ loggedIn ? '已连接' : '未连接' }}
      </v-chip>
      <v-spacer />
      <v-btn icon variant="text" size="small" title="刷新" :loading="loading" @click="loadStatus">
        <v-icon>mdi-refresh</v-icon>
      </v-btn>
      <v-btn icon variant="text" size="small" title="关闭" @click="close">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </v-card-title>

    <v-tabs v-model="tab" density="comfortable" color="primary" class="px-4">
      <v-tab value="status" prepend-icon="mdi-view-dashboard-outline">状态</v-tab>
      <v-tab value="settings" prepend-icon="mdi-cog-outline">设置</v-tab>
    </v-tabs>

    <v-card-text class="pt-4">
      <v-alert
        v-if="message" :type="messageType" variant="tonal" density="compact"
        class="mb-3 text-caption" closable @click:close="message = ''"
      >{{ message }}</v-alert>

      <!-- 第一层：只读状态 -->
      <div v-if="tab === 'status'">
        <v-alert
          v-if="!loggedIn && !loading" type="warning" variant="tonal" density="compact"
          class="mb-3 text-caption"
        >
          {{ status?.message || '尚未配置或 Cookie 已失效，请到「设置」页更新 Cookie 或重新扫码登录。' }}
          <template #append>
            <v-btn size="x-small" variant="text" @click="tab = 'settings'">去设置</v-btn>
          </template>
        </v-alert>

        <v-alert
          v-for="warning in warnings" :key="warning"
          type="warning" variant="tonal" density="compact" class="mb-3 text-caption"
        >{{ warning }}</v-alert>

        <!-- 已保存配置（只读） -->
        <div class="d-flex align-center mb-2">
          <v-icon size="small" class="mr-1">mdi-content-save-check-outline</v-icon>
          <span class="text-subtitle-2">已保存的设置</span>
          <v-spacer />
          <v-btn size="x-small" variant="text" color="primary" prepend-icon="mdi-pencil"
                 @click="tab = 'settings'">去设置</v-btn>
        </div>
        <v-row dense class="mb-2">
          <v-col v-for="item in savedSettings" :key="item.label" cols="12" sm="6" md="4">
            <v-card variant="outlined" rounded="lg" class="pa-2 h-100">
              <div class="d-flex align-center text-caption text-medium-emphasis mb-1">
                <v-icon size="x-small" class="mr-1">{{ item.icon }}</v-icon>{{ item.label }}
              </div>
              <div class="text-body-2 font-weight-medium text-truncate"
                   :class="item.color === 'success' ? 'text-success' : ''">
                {{ item.value }}
              </div>
            </v-card>
          </v-col>
        </v-row>

        <!-- 实时概览 -->
        <v-row dense class="mb-2 mt-2">
          <v-col v-for="card in summary" :key="card.label" cols="12" sm="6" md="4">
            <v-card variant="outlined" rounded="lg" class="pa-3 h-100">
              <div class="d-flex align-center text-caption text-medium-emphasis mb-1">
                <v-icon size="x-small" class="mr-1">{{ card.icon }}</v-icon>{{ card.label }}
              </div>
              <div class="text-body-2 font-weight-medium">{{ card.value }}</div>
              <div v-if="card.sub" class="text-caption text-medium-emphasis mt-1">
                {{ card.sub }}
              </div>
            </v-card>
          </v-col>
        </v-row>

        <!-- 设备与域名 -->
        <div class="d-flex align-center mb-2 mt-4">
          <v-icon size="small" class="mr-1">mdi-devices</v-icon>
          <span class="text-subtitle-2">设备、套餐与域名</span>
          <v-spacer />
          <v-btn
            color="primary" variant="tonal" size="small" prepend-icon="mdi-play"
            :loading="running" :disabled="!loggedIn || running" @click="runRenew"
          >立即续期</v-btn>
        </div>
        <div class="text-caption text-medium-emphasis mb-2">
          「立即续期」会直接重新领取免费套餐，不受「自动续期时机」限制。
        </div>

        <v-skeleton-loader v-if="loading" type="list-item-two-line@3" />

        <v-alert v-else-if="!devices.length" type="info" variant="tonal" density="compact"
                 class="text-caption">
          没有读取到设备，请检查 Cookie 是否有效。
        </v-alert>

        <v-row v-else dense>
          <v-col v-for="device in devices" :key="device.id" cols="12" md="6">
            <v-card variant="outlined" rounded="lg" class="pa-3 h-100">
              <div class="d-flex align-start">
                <v-icon :color="deviceColor(device)" class="mr-2 mt-1">mdi-router-wireless</v-icon>
                <div class="flex-grow-1 min-w-0">
                  <div class="text-body-2 font-weight-medium text-truncate">{{ device.name }}</div>
                  <div class="text-caption text-medium-emphasis">
                    {{ device.status }} · {{ device.plan_name || '未绑定套餐' }}
                  </div>
                  <div class="text-caption"
                       :class="device.needs_renew ? 'text-warning' : 'text-medium-emphasis'">
                    {{ deviceHint(device) }}
                  </div>
                  <div v-if="device.expires_at" class="text-caption text-medium-emphasis">
                    到期：{{ device.expires_at }} {{ remainingText(device) }}
                  </div>
                  <div v-if="device.domains && device.domains.length" class="mt-2">
                    <div class="text-caption text-medium-emphasis mb-1">
                      <v-icon size="x-small">mdi-web</v-icon> 已配置域名（{{ device.domains.length }}）
                    </div>
                    <v-table density="compact" class="text-caption">
                      <thead>
                        <tr>
                          <th class="text-left">备注</th>
                          <th class="text-left">外网域名</th>
                          <th class="text-left">内网地址</th>
                        </tr>
                      </thead>
                      <tbody>
                        <tr v-for="domain in device.domains" :key="domain.id ?? domain.prefix">
                          <td>{{ domain.note || '—' }}</td>
                          <td>{{ domain.url || domain.prefix || '—' }}</td>
                          <td>{{ domain.target || '—' }}</td>
                        </tr>
                      </tbody>
                    </v-table>
                  </div>
                  <div v-else class="text-caption text-medium-emphasis mt-1">
                    未配置穿透域名
                  </div>
                </div>
              </div>
            </v-card>
          </v-col>
        </v-row>

        <!-- 最近一次结果 -->
        <v-divider class="my-4" />
        <div class="d-flex align-center mb-2">
          <v-icon size="small" class="mr-1">mdi-history</v-icon>
          <span class="text-subtitle-2">最近一次执行</span>
          <v-spacer />
          <span class="text-caption text-medium-emphasis">{{ lastResult?.time || '尚未执行' }}</span>
        </div>
        <v-alert
          v-if="lastResult?.message" :type="lastResult.success ? 'success' : 'error'"
          variant="tonal" density="compact" class="text-caption"
        >{{ lastResult.message }}</v-alert>
        <v-alert v-else type="info" variant="tonal" density="compact" class="text-caption">
          暂无执行记录，可点击上方「立即续期」手动触发一次。
        </v-alert>
      </div>

      <!-- 第二层：设置 -->
      <div v-else>
        <SettingsForm
          :api="props.api"
          :plugin-id="props.pluginId"
          :initial-config="config"
          :saving="saving"
          @save="onSaveConfig"
          @refresh="loadStatus"
        />
      </div>
    </v-card-text>
  </v-card>
</template>
