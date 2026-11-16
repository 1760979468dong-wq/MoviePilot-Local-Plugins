<script setup>
/**
 * DDNSTO 自动续期的共享设置表单。
 * 配置弹窗（Config.vue）与插件详情页的「设置」层（Page.vue）复用同一份表单，
 * 避免两处设置不一致。同时提供穿透域名的查看与增删改。
 */
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'

const props = defineProps({
  api: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: 'DdnstoRenew' },
  initialConfig: { type: Object, default: () => ({}) },
  saving: { type: Boolean, default: false },
})

const emit = defineEmits(['save', 'close', 'refresh'])

const form = reactive({
  enabled: false,
  base_url: 'https://web.kooldns.cn',
  cookie: '',
  device_ids: [],
  check_hours: 6,
  renew_before_days: 1,
  notify_enabled: true,
  notify_on_error: true,
})

const devices = ref([])
const probing = ref(false)
const probeState = ref({ ok: null, message: '' })
const showCookie = ref(false)

// 微信扫码登录
const qrDialog = ref(false)
const qrImage = ref('')
const qrToken = ref('')
const qrStatus = ref('idle')
const qrMessage = ref('')
const qrLoading = ref(false)
let qrTimer = null
let qrBusy = false

// 域名管理
const domainDialog = ref(false)
const domainSaving = ref(false)
const domainMessage = ref('')
const deleteTarget = ref(null)
const domainForm = reactive({
  record_id: null,
  device_id: null,
  prefix: '',
  target: '',
  note: '',
})

const CHECK_OPTIONS = [
  { title: '每 1 小时', value: 1 },
  { title: '每 3 小时', value: 3 },
  { title: '每 6 小时', value: 6 },
  { title: '每 12 小时', value: 12 },
  { title: '每天 09:00', value: 24 },
]

const DAY_OPTIONS = [
  { title: '到期后再领取', value: 0 },
  { title: '剩余不足 1 天', value: 1 },
  { title: '剩余不足 2 天', value: 2 },
  { title: '剩余不足 3 天', value: 3 },
  { title: '剩余不足 4 天', value: 4 },
  { title: '剩余不足 5 天', value: 5 },
  { title: '剩余不足 6 天', value: 6 },
  { title: '剩余不足 7 天', value: 7 },
]

function applyConfig(config) {
  if (!config || typeof config !== 'object') return
  for (const key of Object.keys(form)) {
    if (config[key] !== undefined && config[key] !== null) form[key] = config[key]
  }
  if (!Array.isArray(form.device_ids)) form.device_ids = []
  form.device_ids = form.device_ids.map(Number).filter(id => Number.isFinite(id))
}

applyConfig(props.initialConfig)
watch(() => props.initialConfig, value => applyConfig(value), { deep: true })

function unwrap(response) {
  if (response && response.data !== undefined) return response.data
  return response
}

const cookieReady = computed(() => String(form.cookie || '').trim().length > 0)
const selectedText = computed(() => {
  if (!form.device_ids.length) return '全部符合条件的设备'
  return `已选 ${form.device_ids.length} 台设备`
})
const deviceOptions = computed(() =>
  devices.value.map(d => ({ title: d.name, value: d.id })),
)
const domainDevices = computed(() =>
  devices.value.filter(d => (d.domains || []).length > 0),
)

async function probe() {
  if (!cookieReady.value) {
    probeState.value = { ok: false, message: '请先填写 Cookie' }
    return
  }
  probing.value = true
  probeState.value = { ok: null, message: '' }
  try {
    const response = unwrap(await props.api.post(`plugin/${props.pluginId}/probe`, {
      cookie: form.cookie,
      base_url: form.base_url,
    }))
    if (response?.success) {
      devices.value = response.devices || []
      probeState.value = {
        ok: true,
        message: `连接成功（账号 ${response.user?.username || response.user?.id}，共 ${response.device_count} 台设备）`,
      }
      const ids = new Set(devices.value.map(d => d.id))
      form.device_ids = form.device_ids.filter(id => ids.has(id))
    } else {
      devices.value = []
      probeState.value = { ok: false, message: response?.message || '连接失败' }
    }
  } catch (err) {
    devices.value = []
    probeState.value = { ok: false, message: err?.message || '连接失败' }
  } finally {
    probing.value = false
  }
}

function stopQrPolling() {
  if (qrTimer) {
    clearInterval(qrTimer)
    qrTimer = null
  }
  qrBusy = false
}

async function startQrLogin() {
  stopQrPolling()
  qrDialog.value = true
  qrLoading.value = true
  qrStatus.value = 'loading'
  qrMessage.value = '正在获取二维码…'
  qrImage.value = ''
  try {
    const response = unwrap(await props.api.post(`plugin/${props.pluginId}/login/qr`))
    if (!response?.success) {
      qrStatus.value = 'error'
      qrMessage.value = response?.message || '二维码获取失败'
      return
    }
    qrToken.value = response.token
    qrImage.value = response.qr_image || ''
    qrStatus.value = 'pending'
    qrMessage.value = response.message || '请使用微信扫描二维码'
    // 后端是长轮询，用 busy 标记保证同一时刻只有一个请求在途
    qrTimer = setInterval(() => {
      if (qrBusy) return
      qrBusy = true
      pollQrLogin().finally(() => { qrBusy = false })
    }, 1000)
  } catch (err) {
    qrStatus.value = 'error'
    qrMessage.value = err?.message || '二维码获取失败'
  } finally {
    qrLoading.value = false
  }
}

async function pollQrLogin() {
  if (!qrToken.value) return
  try {
    const response = unwrap(await props.api.get(
      `plugin/${props.pluginId}/login/qr/poll?token=${encodeURIComponent(qrToken.value)}`,
      { feedback: 'silent' },
    ))
    const status = response?.status || 'pending'
    qrMessage.value = response?.message || qrMessage.value
    if (status === 'success') {
      stopQrPolling()
      qrStatus.value = 'success'
      if (response.cookie) form.cookie = response.cookie
      emit('refresh')
      await probe()
      setTimeout(() => { qrDialog.value = false }, 1200)
      return
    }
    if (status === 'expired' || status === 'error') {
      stopQrPolling()
      qrStatus.value = status
      return
    }
    qrStatus.value = status
  } catch (err) {
    stopQrPolling()
    qrStatus.value = 'error'
    qrMessage.value = err?.message || '登录状态查询失败'
  }
}

function closeQrDialog() {
  stopQrPolling()
  qrDialog.value = false
}

function openAddDomain(deviceId = null) {
  domainForm.record_id = null
  domainForm.device_id = deviceId ?? form.device_ids[0] ?? devices.value[0]?.id ?? null
  domainForm.prefix = ''
  domainForm.target = ''
  domainForm.note = ''
  domainMessage.value = ''
  domainDialog.value = true
}

function openEditDomain(device, domain) {
  domainForm.record_id = domain.id
  domainForm.device_id = device.id
  domainForm.prefix = domain.prefix || ''
  domainForm.target = domain.target || ''
  domainForm.note = domain.note || ''
  domainMessage.value = ''
  domainDialog.value = true
}

async function saveDomain() {
  if (domainSaving.value) return
  domainSaving.value = true
  domainMessage.value = ''
  try {
    const response = unwrap(await props.api.post(`plugin/${props.pluginId}/domain/save`, {
      record_id: domainForm.record_id,
      device_id: domainForm.device_id,
      prefix: domainForm.prefix,
      target: domainForm.target,
      note: domainForm.note,
    }))
    if (!response?.success) {
      domainMessage.value = response?.message || '保存失败'
      return
    }
    domainDialog.value = false
    probeState.value = { ok: true, message: response.message }
    await probe()
  } catch (err) {
    domainMessage.value = err?.message || '保存失败'
  } finally {
    domainSaving.value = false
  }
}

async function confirmDeleteDomain() {
  if (!deleteTarget.value || domainSaving.value) return
  domainSaving.value = true
  try {
    const response = unwrap(await props.api.post(`plugin/${props.pluginId}/domain/delete`, {
      record_id: deleteTarget.value.id,
    }))
    probeState.value = {
      ok: !!response?.success,
      message: response?.message || '删除完成',
    }
    deleteTarget.value = null
    await probe()
  } catch (err) {
    probeState.value = { ok: false, message: err?.message || '删除失败' }
  } finally {
    domainSaving.value = false
  }
}

function onSave() {
  emit('save', { ...form, device_ids: [...form.device_ids] })
}

onMounted(() => {
  if (cookieReady.value) probe()
})

onUnmounted(() => {
  stopQrPolling()
})
</script>

<template>
  <div>
    <v-alert type="info" variant="tonal" density="compact" class="mb-4 text-caption">
      登录页有图形验证码，无法用账号密码自动登录；点「微信扫码登录」用手机微信扫一下即可自动获取并保存 Cookie。
      也可以手动复制：打开
      <a href="https://web.kooldns.cn" target="_blank" rel="noopener">web.kooldns.cn</a>
      登录后按 F12 → 应用 → Cookie，按 <code>sessionid=xxx; csrftoken=yyy</code> 格式填入。
      Cookie 有效期约 14 天，过期后重新扫码即可。
    </v-alert>

    <v-card variant="outlined" class="mb-4 pa-3" rounded="lg">
      <div class="d-flex align-center">
        <v-icon :color="form.enabled ? 'success' : 'grey'" class="mr-2">mdi-clock-outline</v-icon>
        <div class="flex-grow-1">
          <div class="text-body-2 font-weight-medium">自动定时续期</div>
          <div class="text-caption text-medium-emphasis">
            {{ form.enabled ? '已启用，满足条件时自动重新领取免费套餐' : '未启用，仅支持手动续期' }}
          </div>
        </div>
        <v-switch v-model="form.enabled" color="success" hide-details inset class="flex-grow-0" />
      </div>
    </v-card>

    <div class="text-subtitle-2 mb-2 d-flex align-center">
      <v-icon size="small" class="mr-1">mdi-link-variant</v-icon>站点与登录凭证
    </div>
    <v-row dense>
      <v-col cols="12" md="8">
        <v-text-field
          v-model="form.base_url" label="站点地址"
          variant="outlined" density="comfortable" hide-details
        />
      </v-col>
      <v-col cols="12" md="4" class="d-flex align-center">
        <v-btn
          block color="success" variant="tonal" prepend-icon="mdi-qrcode-scan"
          @click="startQrLogin"
        >微信扫码登录</v-btn>
      </v-col>
      <v-col cols="12">
        <v-textarea
          v-if="showCookie"
          v-model="form.cookie"
          label="会话 Cookie"
          placeholder="sessionid=xxx; csrftoken=yyy"
          variant="outlined" density="comfortable" rows="2" auto-grow hide-details
          class="mt-3"
        />
        <v-text-field
          v-else
          v-model="form.cookie"
          type="password"
          label="会话 Cookie"
          placeholder="sessionid=xxx; csrftoken=yyy"
          variant="outlined" density="comfortable" hide-details
          class="mt-3"
        />
        <div class="d-flex align-center ga-2 mt-1 flex-wrap">
          <v-btn
            size="small" variant="text" color="primary"
            :prepend-icon="showCookie ? 'mdi-eye-off' : 'mdi-eye'"
            @click="showCookie = !showCookie"
          >{{ showCookie ? '隐藏 Cookie' : '显示 Cookie' }}</v-btn>
          <v-btn
            size="small" variant="text" color="primary" :loading="probing"
            prepend-icon="mdi-connection" @click="probe"
          >读取设备与域名</v-btn>
          <v-spacer />
          <span v-if="probeState.message" class="text-caption"
                :class="probeState.ok ? 'text-success' : 'text-error'">
            {{ probeState.message }}
          </span>
        </div>
      </v-col>
    </v-row>

    <v-divider class="my-4" />

    <div class="d-flex align-center mb-2">
      <v-icon size="small" class="mr-1">mdi-devices</v-icon>
      <span class="text-subtitle-2">自动续期设备</span>
      <v-spacer />
      <v-chip size="x-small" variant="tonal">{{ selectedText }}</v-chip>
    </div>
    <v-alert
      v-if="!devices.length" type="warning" variant="tonal" density="compact"
      class="text-caption mb-2"
    >
      尚未读取到设备。扫码或填入 Cookie 后点击「读取设备与域名」，即可勾选需要自动续期的设备；
      不勾选则对全部符合条件的设备生效。
    </v-alert>
    <v-row v-else dense>
      <v-col v-for="device in devices" :key="device.id" cols="12" md="6">
        <v-card variant="outlined" rounded="lg" class="pa-2">
          <v-checkbox
            v-model="form.device_ids" :value="device.id" hide-details density="compact"
            color="primary"
          >
            <template #label>
              <div class="min-w-0">
                <div class="text-body-2 font-weight-medium text-truncate">{{ device.name }}</div>
                <div class="text-caption text-medium-emphasis text-truncate">
                  {{ device.status }} · {{ device.plan_name }}
                  <template v-if="device.expires_at"> · 至 {{ device.expires_at }}</template>
                </div>
              </div>
            </template>
          </v-checkbox>
        </v-card>
      </v-col>
    </v-row>

    <v-divider class="my-4" />

    <!-- 域名管理 -->
    <div class="d-flex align-center mb-2">
      <v-icon size="small" class="mr-1">mdi-web</v-icon>
      <span class="text-subtitle-2">穿透域名管理</span>
      <v-spacer />
      <v-btn
        size="small" color="primary" variant="tonal" prepend-icon="mdi-plus"
        :disabled="!devices.length" @click="openAddDomain()"
      >添加域名</v-btn>
    </div>
    <v-alert
      v-if="!domainDevices.length" type="info" variant="tonal" density="compact"
      class="text-caption mb-2"
    >
      没有读取到已配置的域名。请先在上方点击「读取设备与域名」。
    </v-alert>
    <div v-for="device in domainDevices" :key="device.id" class="mb-3">
      <div class="text-body-2 font-weight-medium mb-1">
        <v-icon size="x-small" class="mr-1">mdi-router-wireless</v-icon>{{ device.name }}
        <span class="text-caption text-medium-emphasis">（{{ device.domains.length }} 条）</span>
      </div>
      <v-table density="compact" class="text-caption">
        <thead>
          <tr>
            <th class="text-left">备注</th>
            <th class="text-left">外网域名</th>
            <th class="text-left">内网地址</th>
            <th class="text-right">操作</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="domain in device.domains" :key="domain.id">
            <td>{{ domain.note || '—' }}</td>
            <td>{{ domain.url || domain.prefix || '—' }}</td>
            <td>{{ domain.target || '—' }}</td>
            <td class="text-right">
              <v-btn icon size="x-small" variant="text" title="编辑"
                     @click="openEditDomain(device, domain)">
                <v-icon size="small">mdi-pencil</v-icon>
              </v-btn>
              <v-btn icon size="x-small" variant="text" color="error" title="删除"
                     @click="deleteTarget = { ...domain, deviceName: device.name }">
                <v-icon size="small">mdi-delete</v-icon>
              </v-btn>
            </td>
          </tr>
        </tbody>
      </v-table>
    </div>

    <v-divider class="my-4" />

    <div class="text-subtitle-2 mb-2 d-flex align-center">
      <v-icon size="small" class="mr-1">mdi-tune</v-icon>执行策略
    </div>
    <v-row dense>
      <v-col cols="12" sm="6">
        <v-select
          v-model="form.check_hours" :items="CHECK_OPTIONS" item-title="title" item-value="value"
          label="检查间隔" variant="outlined" density="comfortable" hide-details
        />
      </v-col>
      <v-col cols="12" sm="6">
        <v-select
          v-model="form.renew_before_days" :items="DAY_OPTIONS"
          item-title="title" item-value="value"
          label="自动续期时机" variant="outlined" density="comfortable" hide-details
        />
      </v-col>
      <v-col cols="12">
        <div class="text-caption text-medium-emphasis mt-1">
          免费套餐不可叠加，但未到期也能重新领取，新套餐有效期从领取时刻重新计算 7 天。
          例如剩余 4 天时领取，有效期会变成「今天 + 7 天」，不会浪费。
          详情页的「立即续期」按钮不受此设置限制，会直接领取。
        </div>
      </v-col>
    </v-row>

    <v-divider class="my-4" />

    <div class="text-subtitle-2 mb-2 d-flex align-center">
      <v-icon size="small" class="mr-1">mdi-bell-outline</v-icon>通知
    </div>
    <v-row dense>
      <v-col cols="12" sm="6">
        <v-switch v-model="form.notify_enabled" color="success" inset hide-details>
          <template #label><span class="text-body-2">续期成功通知</span></template>
        </v-switch>
      </v-col>
      <v-col cols="12" sm="6">
        <v-switch v-model="form.notify_on_error" color="success" inset hide-details>
          <template #label><span class="text-body-2">失败时提醒</span></template>
        </v-switch>
      </v-col>
    </v-row>

    <div class="d-flex justify-end ga-2 mt-4">
      <v-btn color="primary" variant="flat" :loading="saving" @click="onSave">保存设置</v-btn>
    </div>

    <!-- 域名编辑弹窗 -->
    <v-dialog v-model="domainDialog" max-width="440">
      <v-card>
        <v-card-title class="text-body-1 d-flex align-center">
          <v-icon class="mr-2" color="primary">mdi-web</v-icon>
          {{ domainForm.record_id ? '修改域名' : '添加域名' }}
          <v-spacer />
          <v-btn icon variant="text" size="small" @click="domainDialog = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <v-select
            v-model="domainForm.device_id" :items="deviceOptions"
            item-title="title" item-value="value" label="所属设备"
            variant="outlined" density="comfortable" hide-details
            :disabled="!!domainForm.record_id" class="mb-3"
          />
          <v-text-field
            v-model="domainForm.prefix" label="域名前缀"
            placeholder="例如 xiaoluo5（对应 https://xiaoluo5.ddnsto.com）"
            variant="outlined" density="comfortable" hide-details class="mb-3"
          />
          <v-text-field
            v-model="domainForm.target" label="内网地址"
            placeholder="例如 https://ddnsto.example.com"
            variant="outlined" density="comfortable" hide-details class="mb-3"
          />
          <v-text-field
            v-model="domainForm.note" label="备注"
            placeholder="例如 emby / qb"
            variant="outlined" density="comfortable" hide-details
          />
          <v-alert v-if="domainMessage" type="error" variant="tonal" density="compact"
                   class="mt-3 text-caption">{{ domainMessage }}</v-alert>
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="domainDialog = false">取消</v-btn>
          <v-btn color="primary" variant="flat" :loading="domainSaving" @click="saveDomain">
            保存
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 删除确认 -->
    <v-dialog :model-value="!!deleteTarget" max-width="380"
              @update:model-value="deleteTarget = null">
      <v-card>
        <v-card-title class="text-body-1">删除域名</v-card-title>
        <v-card-text class="text-body-2">
          确定删除
          <strong>{{ deleteTarget?.note || deleteTarget?.prefix }}</strong>
          （{{ deleteTarget?.url || deleteTarget?.target }}）吗？删除后该穿透地址将立即失效。
        </v-card-text>
        <v-card-actions class="px-4 pb-4">
          <v-spacer />
          <v-btn variant="text" @click="deleteTarget = null">取消</v-btn>
          <v-btn color="error" variant="flat" :loading="domainSaving"
                 @click="confirmDeleteDomain">删除</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>

    <!-- 微信扫码登录 -->
    <v-dialog
      :model-value="qrDialog" max-width="360" persistent
      @update:model-value="closeQrDialog"
    >
      <v-card>
        <v-card-title class="text-body-1 d-flex align-center">
          <v-icon class="mr-2" color="success">mdi-wechat</v-icon>微信扫码登录
          <v-spacer />
          <v-btn icon variant="text" size="small" @click="closeQrDialog">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text class="text-center">
          <div
            class="mx-auto d-flex align-center justify-center"
            style="width: 220px; height: 220px"
          >
            <v-progress-circular v-if="qrLoading" indeterminate color="primary" />
            <img
              v-else-if="qrImage" :src="qrImage" alt="微信登录二维码"
              style="width: 220px; height: 220px"
            >
            <v-icon v-else size="64" color="grey">mdi-qrcode-remove</v-icon>
          </div>
          <div
            class="text-body-2 mt-3"
            :class="qrStatus === 'error' || qrStatus === 'expired' ? 'text-error' : 'text-medium-emphasis'"
          >
            {{ qrMessage }}
          </div>
          <v-btn
            v-if="qrStatus === 'expired' || qrStatus === 'error'"
            class="mt-3" color="primary" variant="tonal" size="small"
            prepend-icon="mdi-refresh" @click="startQrLogin"
          >重新获取二维码</v-btn>
        </v-card-text>
      </v-card>
    </v-dialog>
  </div>
</template>
