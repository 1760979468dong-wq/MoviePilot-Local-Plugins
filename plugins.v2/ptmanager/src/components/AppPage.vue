<script setup>
import PTManagerWorkbench from './PTManagerWorkbench.vue'

defineProps({
  api: { type: Object, default: () => ({}) },
  navKey: { type: String, default: 'main' },
  pluginId: { type: String, default: 'PTManager' },
  sourcePluginId: { type: String, default: '' },
  nativeSubscribe: { type: Function, default: null },
})

defineEmits(['action'])
</script>

<template>
  <PTManagerWorkbench :api="api" :plugin-id="pluginId" :nav-key="navKey" @action="$emit('action')" />
</template>
