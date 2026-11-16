<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { getSiteIcon } from '../utils'

const props = defineProps({
  api: { type: Object, default: () => ({}) },
  site: { type: Object, default: () => ({}) },
  size: { type: [Number, String], default: 34 },
})

const icon = ref('')
const fallback = computed(() =>
  String(props.site?.name || props.site?.domain || '?').trim().slice(0, 1).toUpperCase(),
)

async function loadIcon() {
  icon.value = await getSiteIcon(props.api, props.site?.site_id)
}

watch(() => props.site?.site_id, loadIcon)
onMounted(loadIcon)
</script>

<template>
  <VAvatar :size="size" color="primary" variant="tonal" rounded="lg">
    <VImg v-if="icon" :src="icon" :alt="site.name" />
    <span v-else class="font-weight-bold">{{ fallback }}</span>
  </VAvatar>
</template>
