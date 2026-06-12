import { defineStore } from 'pinia'
import { computed, shallowRef } from 'vue'

// Placeholder store — Phase 1 replaces this with the real ingestion pipeline
// (TakeoutBundle, LoadReport, loadFromFile/loadFromUrl).
export const useTakeoutStore = defineStore('takeout', () => {
  const bundle = shallowRef<object | null>(null)

  const hasData = computed(() => bundle.value !== null)

  function clear(): void {
    bundle.value = null
  }

  return { bundle, hasData, clear }
})
