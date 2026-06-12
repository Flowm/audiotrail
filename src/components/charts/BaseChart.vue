<script setup lang="ts">
import VChart from 'vue-echarts'

import './echarts'

import EmptyState from '@/components/ui/EmptyState.vue'

import type { EChartsOption } from 'echarts'

withDefaults(
  defineProps<{
    option: EChartsOption | null
    height?: number
    emptyTitle?: string
    emptyMessage?: string
  }>(),
  { height: 320, emptyTitle: 'Nothing to show', emptyMessage: undefined },
)
</script>

<template>
  <div class="relative w-full" :style="{ height: `${height}px` }">
    <VChart
      v-if="option"
      :option="option"
      :update-options="{ notMerge: true }"
      autoresize
      class="h-full w-full"
    />
    <EmptyState v-else :title="emptyTitle" :message="emptyMessage" class="absolute inset-0" />
  </div>
</template>
