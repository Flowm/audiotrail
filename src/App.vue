<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'

import AppShell from '@/components/layout/AppShell.vue'
import { useSettingsStore } from '@/stores/settings'

// Instantiating the store applies the persisted dark-mode class immediately.
useSettingsStore()

const route = useRoute()
const bare = computed(() => route.meta.layout === 'bare')
</script>

<template>
  <AppShell v-if="!bare">
    <RouterView />
  </AppShell>
  <RouterView v-else />
</template>
