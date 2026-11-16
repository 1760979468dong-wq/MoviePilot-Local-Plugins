<script setup>
import { computed } from 'vue'

const props = defineProps({
  points: { type: Array, default: () => [] },
  color: { type: String, default: 'rgb(var(--v-theme-primary))' },
  height: { type: Number, default: 46 },
  width: { type: Number, default: 160 },
})

/** 计算折线的 SVG 坐标点。 */
const geometry = computed(() => {
  const values = (props.points || []).map(value => Number(value) || 0)
  if (values.length < 2) return { line: '', area: '' }
  const max = Math.max(...values)
  const min = Math.min(...values)
  const span = max - min || 1
  const stepX = props.width / (values.length - 1)
  const coordinates = values.map((value, index) => {
    const x = index * stepX
    const y = props.height - 3 - ((value - min) / span) * (props.height - 8)
    return [x, y]
  })
  const line = coordinates.map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`).join(' ')
  const area = `0,${props.height} ${line} ${props.width},${props.height}`
  return { line, area }
})
</script>

<template>
  <svg
    class="ptm-sparkline"
    :viewBox="`0 0 ${width} ${height}`"
    :width="width"
    :height="height"
    preserveAspectRatio="none"
    role="img"
    aria-label="趋势图"
  >
    <polygon v-if="geometry.area" :points="geometry.area" :fill="color" opacity="0.16" />
    <polyline
      v-if="geometry.line"
      :points="geometry.line"
      fill="none"
      :stroke="color"
      stroke-width="2"
      stroke-linejoin="round"
      stroke-linecap="round"
    />
  </svg>
</template>

<style scoped>
.ptm-sparkline {
  display: block;
  width: 100%;
  overflow: visible;
}
</style>
