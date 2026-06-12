<script setup lang="ts">
import { computed } from 'vue'

import { useSettingsStore } from '@/stores/settings'
import { useTakeoutStore } from '@/stores/takeout'

const takeout = useTakeoutStore()
const settings = useSettingsStore()

const options = computed(() => ['all', ...takeout.profiles])

function label(profile: string): string {
  return profile === 'all' ? 'All profiles' : profile
}
</script>

<template>
  <div class="flex flex-wrap gap-1">
    <button
      v-for="profile in options"
      :key="profile"
      type="button"
      :class="[
        'rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors',
        settings.selectedProfile === profile
          ? 'bg-accent-600/15 text-accent-700 dark:bg-accent-400/15 dark:text-accent-300'
          : 'text-ink-500 hover:bg-paper-200/60 hover:text-ink-800 dark:text-ink-400 dark:hover:bg-ink-800/60 dark:hover:text-ink-100',
      ]"
      @click="settings.selectedProfile = profile"
    >
      {{ label(profile) }}
    </button>
  </div>
</template>
