<script setup>
/**
 * 插件配置弹窗：复用共享的 SettingsForm，保证与详情页内的设置完全一致。
 */
import { onMounted } from 'vue'
import SettingsForm from './SettingsForm.vue'

const props = defineProps({
  initialConfig: { type: Object, default: () => ({}) },
  api: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: 'DdnstoRenew' },
  sourcePluginId: { type: String, default: '' },
  nativeSubscribe: { type: Function, default: null },
})

const emit = defineEmits(['layout', 'save', 'close', 'switch'])

function onSave(data) {
  emit('save', data)
}

function onClose() {
  emit('close')
}

onMounted(() => {
  emit('layout', { maxWidth: '60rem' })
})
</script>

<template>
  <v-card flat>
    <v-card-title class="d-flex align-center flex-wrap ga-2 pt-4 pb-3">
      <v-icon color="primary" class="mr-2">mdi-refresh-circle</v-icon>
      <span class="text-h6">DDNSTO 自动续期</span>
      <v-chip size="small" variant="tonal" color="secondary">免费 7 天套餐</v-chip>
      <v-spacer />
      <v-btn icon variant="text" size="small" title="关闭" @click="onClose">
        <v-icon>mdi-close</v-icon>
      </v-btn>
    </v-card-title>

    <v-card-text class="pt-0">
      <SettingsForm
        :api="props.api"
        :plugin-id="props.pluginId"
        :initial-config="props.initialConfig"
        @save="onSave"
      />
    </v-card-text>

    <v-card-actions class="px-4 pb-4">
      <v-spacer />
      <v-btn variant="text" @click="onClose">关闭</v-btn>
    </v-card-actions>
  </v-card>
</template>
