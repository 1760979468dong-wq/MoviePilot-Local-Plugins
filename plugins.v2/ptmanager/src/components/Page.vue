<script setup>
import PTManagerWorkbench from './PTManagerWorkbench.vue'

defineProps({
  api: { type: Object, default: () => ({}) },
  pluginId: { type: String, default: 'PTManager' },
  sourcePluginId: { type: String, default: '' },
  nativeSubscribe: { type: Function, default: null },
})

defineEmits(['action', 'switch', 'close'])
</script>

<template>
  <PTManagerWorkbench
    :api="api"
    :plugin-id="pluginId"
    compact
    show-close
    @action="$emit('action')"
    @close="$emit('close')"
  />
</template>
