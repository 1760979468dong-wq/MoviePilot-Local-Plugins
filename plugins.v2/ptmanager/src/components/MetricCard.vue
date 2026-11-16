<script setup>
/** 合计指标卡片：柔和渐变底 + 右上角大图标水印，突出数值本身。 */
defineProps({
  label: { type: String, required: true },
  value: { type: String, required: true },
  icon: { type: String, default: 'mdi-chart-line' },
  color: { type: String, default: 'primary' },
  hint: { type: String, default: '' },
})
</script>

<template>
  <VCard class="ptm-metric" rounded="lg" variant="flat" :class="`ptm-metric--${color}`">
    <VIcon class="ptm-metric__watermark" :icon="icon" size="76" />
    <div class="ptm-metric__body">
      <div class="ptm-metric__head">
        <span class="ptm-metric__dot" />
        <span class="ptm-metric__label">{{ label }}</span>
      </div>
      <div class="ptm-metric__value">{{ value }}</div>
      <div v-if="hint" class="ptm-metric__hint">{{ hint }}</div>
    </div>
  </VCard>
</template>

<style scoped>
.ptm-metric {
  background: linear-gradient(
    135deg,
    rgba(var(--ptm-rgb), 0.16),
    rgba(var(--ptm-rgb), 0.04)
  );
  border: 1px solid rgba(var(--ptm-rgb), 0.24);
  height: 100%;
  overflow: hidden;
  position: relative;
  transition: border-color 0.16s ease, transform 0.16s ease;
}

.ptm-metric:hover {
  border-color: rgba(var(--ptm-rgb), 0.46);
}

/* 按主题色定义 RGB 变量，供渐变与边框复用 */
.ptm-metric--primary { --ptm-rgb: var(--v-theme-primary); }
.ptm-metric--success { --ptm-rgb: var(--v-theme-success); }
.ptm-metric--info { --ptm-rgb: var(--v-theme-info); }
.ptm-metric--warning { --ptm-rgb: var(--v-theme-warning); }
.ptm-metric--teal { --ptm-rgb: 0, 172, 193; }
.ptm-metric--amber-darken-2 { --ptm-rgb: 255, 143, 0; }
.ptm-metric--deep-purple { --ptm-rgb: 103, 58, 183; }
.ptm-metric--indigo { --ptm-rgb: 63, 81, 181; }

.ptm-metric__watermark {
  bottom: -18px;
  color: rgba(var(--ptm-rgb), 0.16);
  position: absolute;
  right: -14px;
  transform: rotate(-12deg);
}

.ptm-metric__body {
  padding: 11px 14px 11px 15px;
  position: relative;
}

.ptm-metric__head {
  align-items: center;
  color: rgba(var(--v-theme-on-surface), 0.68);
  display: flex;
  font-size: 0.72rem;
  gap: 7px;
}

.ptm-metric__dot {
  background: rgb(var(--ptm-rgb));
  border-radius: 50%;
  flex: 0 0 auto;
  height: 6px;
  width: 6px;
}

.ptm-metric__label {
  font-weight: 600;
  letter-spacing: 0.02em;
}

.ptm-metric__value {
  color: rgb(var(--ptm-rgb));
  font-size: clamp(1.15rem, 1.9vw, 1.5rem);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.2;
  margin-top: 4px;
  overflow-wrap: anywhere;
}

.ptm-metric__hint {
  color: rgba(var(--v-theme-on-surface), 0.56);
  font-size: 0.68rem;
  margin-top: 2px;
}
</style>
