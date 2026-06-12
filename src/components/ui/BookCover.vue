<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { coverHue, coverUrl, titleInitials } from '@/lib/covers'
import { useSettingsStore } from '@/stores/settings'

const props = defineProps<{ asin: string | null; title: string }>()
const settings = useSettingsStore()

const failed = ref(false)
watch(
  () => props.asin,
  () => {
    failed.value = false
  },
)

const showReal = computed(
  () => settings.loadRealCovers && props.asin !== null && !failed.value,
)
const hue = computed(() => coverHue(props.asin ?? props.title))
</script>

<template>
  <div
    class="relative aspect-square shrink-0 overflow-hidden rounded-md shadow-sm"
    :style="
      showReal
        ? undefined
        : {
            background: `linear-gradient(135deg, hsl(${hue} 36% 48%), hsl(${(hue + 42) % 360} 42% 28%))`,
          }
    "
  >
    <img
      v-if="showReal"
      :src="coverUrl(asin!)"
      :alt="`Cover of ${title}`"
      class="h-full w-full object-cover"
      loading="lazy"
      @error="failed = true"
    />
    <span
      v-else
      class="absolute inset-0 flex items-center justify-center font-display font-semibold text-white/85"
      aria-hidden="true"
    >
      {{ titleInitials(title) }}
    </span>
  </div>
</template>
