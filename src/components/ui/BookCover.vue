<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { coverHue, fetchCoverUrl, titleInitials } from '@/lib/covers'
import { useSettingsStore } from '@/stores/settings'
import { useTakeoutStore } from '@/stores/takeout'

const props = defineProps<{ asin: string | null; title: string }>()
const settings = useSettingsStore()
const takeout = useTakeoutStore()

const resolvedUrl = ref<string | null>(null)
const failed = ref(false)

const hue = computed(() => coverHue(props.asin ?? props.title))
const showReal = computed(() => settings.loadRealCovers && !!resolvedUrl.value && !failed.value)

// Resolve the real cover (opt-in) whenever the book, the toggle, or the
// account region changes. Guards against a stale async result landing after
// the asin has already moved on.
async function resolve(): Promise<void> {
  resolvedUrl.value = null
  failed.value = false
  const asin = props.asin
  if (!settings.loadRealCovers || asin === null) return
  const url = await fetchCoverUrl(asin, takeout.coverRegion)
  if (props.asin === asin) resolvedUrl.value = url
}

watch(
  () => [props.asin, settings.loadRealCovers, takeout.coverRegion],
  () => void resolve(),
  { immediate: true },
)

// Amazon serves a 1px placeholder for missing art with HTTP 200, so onerror
// alone isn't enough — treat a degenerate image as a failure too.
function onLoad(event: Event): void {
  if ((event.target as HTMLImageElement).naturalWidth <= 1) failed.value = true
}
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
      :src="resolvedUrl!"
      :alt="`Cover of ${title}`"
      class="h-full w-full object-cover"
      loading="lazy"
      @error="failed = true"
      @load="onLoad"
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
