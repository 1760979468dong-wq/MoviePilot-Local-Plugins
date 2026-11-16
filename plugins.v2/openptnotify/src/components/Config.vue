<script setup>
import { computed, onMounted, reactive, watch } from 'vue'

const props = defineProps({
  initialConfig: { type: Object, default: () => ({}) },
  api: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: 'OpenPTNotify' },
  sourcePluginId: { type: String, default: '' },
  nativeSubscribe: { type: Function, default: null },
})

const emit = defineEmits(['layout', 'save', 'close', 'switch'])

const form = reactive({
  enabled: false,
  notify_enabled: true,
  cron: '0 9 * * *',
  source_url: 'https://bfjy2024.github.io/openpt/',
  notify_mode: 'all',
  only_open: true,
  mark_owned: true,
  notify_on_error: true,
})

const modeItems = [
  { title: '每次推送全部开注站点', value: 'all' },
  { title: '仅推送新增站点', value: 'new' },
]

// 简单每日 Cron（分 时 * * *）与 HH:MM 时间输入的双向映射
const timeValue = computed({
  get() {
    const matched = /^(\d{1,2})\s+(\d{1,2})\s+\*\s+\*\s+\*$/.exec(String(form.cron || '').trim())
    if (!matched) return ''
    const hour = String(matched[2]).padStart(2, '0')
    const minute = String(matched[1]).padStart(2, '0')
    return `${hour}:${minute}`
  },
  set(value) {
    if (!value) return
    const [hour, minute] = String(value).split(':')
    if (hour === undefined || minute === undefined) return
    form.cron = `${Number(minute)} ${Number(hour)} * * *`
  },
})

function applyConfig(config) {
  if (!config || typeof config !== 'object') return
  for (const key of Object.keys(form)) {
    if (config[key] !== undefined && config[key] !== null) {
      form[key] = config[key]
    }
  }
}

applyConfig(props.initialConfig)
watch(() => props.initialConfig, value => applyConfig(value), { deep: true })

function onSave() {
  emit('save', { ...form })
}

function onClose() {
  emit('close')
}

onMounted(() => emit('layout', { maxWidth: '56rem' }))
</script>

<template>
  <v-card flat>
    <v-card-title class="text-h6">PT开注提醒</v-card-title>
    <v-card-text>
      <v-alert type="info" variant="tonal" density="comfortable" class="mb-4">
        定时抓取开放注册页面，把当前开放注册的 PT 站点推送到已启用的通知渠道。
      </v-alert>

      <v-row dense>
        <v-col cols="12" sm="6">
          <v-switch
            v-model="form.enabled"
            label="启用插件"
            color="primary"
            hide-details
            class="mt-0"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-switch
            v-model="form.notify_enabled"
            label="发送通知"
            color="primary"
            hide-details
            class="mt-0"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="timeValue"
            type="time"
            label="每日通知时间"
            variant="outlined"
            density="comfortable"
            hide-details
            class="mb-3"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-text-field
            v-model="form.cron"
            label="Cron 表达式（高级）"
            variant="outlined"
            density="comfortable"
            hint="默认每日一次即可；如需每周/多时段可直接改写"
            persistent-hint
            class="mb-5"
          />
        </v-col>
        <v-col cols="12">
          <v-text-field
            v-model="form.source_url"
            label="抓取地址"
            variant="outlined"
            density="comfortable"
            hide-details
            class="mb-3"
          />
        </v-col>
        <v-col cols="12" sm="6">
          <v-select
            v-model="form.notify_mode"
            :items="modeItems"
            item-title="title"
            item-value="value"
            label="推送模式"
            variant="outlined"
            density="comfortable"
            hide-details
            class="mb-3"
          />
        </v-col>
      </v-row>

      <v-row dense>
        <v-col cols="12" sm="4">
          <v-switch
            v-model="form.only_open"
            label="只保留开放注册"
            color="primary"
            hide-details
            class="mt-0"
          />
        </v-col>
        <v-col cols="12" sm="4">
          <v-switch
            v-model="form.mark_owned"
            label="通知中标注已拥有"
            color="primary"
            hide-details
            class="mt-0"
          />
        </v-col>
        <v-col cols="12" sm="4">
          <v-switch
            v-model="form.notify_on_error"
            label="失败时提醒"
            color="primary"
            hide-details
            class="mt-0"
          />
        </v-col>
      </v-row>

      <div class="text-caption text-medium-emphasis">
        「已拥有」依据该站点域名是否已在 MoviePilot「站点管理」中配置来判断；关闭上方开关只影响通知正文是否带该标记。
      </div>
    </v-card-text>
    <v-card-actions>
      <v-spacer />
      <v-btn variant="text" @click="onClose">关闭</v-btn>
      <v-btn color="primary" variant="flat" @click="onSave">保存</v-btn>
    </v-card-actions>
  </v-card>
</template>
