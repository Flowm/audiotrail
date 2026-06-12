import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'

import { ingestTakeout } from '@/lib/ingest'
import { zipProvider } from '@/lib/ingest/zip'
import { useSettingsStore } from '@/stores/settings'
import type { IngestProgress, LoadReport, TakeoutBundle } from '@/types/takeout'

export type LoadPhase = 'idle' | 'reading' | 'parsing' | 'ready' | 'error'

export const useTakeoutStore = defineStore('takeout', () => {
  // shallowRef: the bundle holds tens of thousands of immutable rows — deep
  // reactivity would be pure overhead.
  const bundle = shallowRef<TakeoutBundle | null>(null)
  const report = shallowRef<LoadReport | null>(null)
  const phase = ref<LoadPhase>('idle')
  const error = ref<string | null>(null)
  const progress = ref<IngestProgress | null>(null)
  const sourceName = ref<string | null>(null)

  const hasData = computed(() => bundle.value !== null)
  const profiles = computed(() => bundle.value?.profiles ?? [])

  async function loadFromData(data: ArrayBuffer | Blob, name: string): Promise<void> {
    phase.value = 'parsing'
    error.value = null
    progress.value = null
    try {
      const provider = await zipProvider(data)
      const result = await ingestTakeout(provider, (p) => {
        progress.value = p
      })
      bundle.value = result.bundle
      report.value = result.report
      sourceName.value = name
      useSettingsStore().selectedProfile = 'all'
      phase.value = 'ready'
    } catch (cause) {
      bundle.value = null
      report.value = null
      error.value = cause instanceof Error ? cause.message : String(cause)
      phase.value = 'error'
    }
  }

  async function loadFromFile(file: File): Promise<void> {
    phase.value = 'reading'
    error.value = null
    try {
      const data = await file.arrayBuffer()
      await loadFromData(data, file.name)
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause)
      phase.value = 'error'
    }
  }

  async function loadFromUrl(url: string, name: string): Promise<void> {
    phase.value = 'reading'
    error.value = null
    try {
      const response = await fetch(url)
      if (!response.ok) {
        throw new Error(`Could not fetch ${name} (HTTP ${response.status})`)
      }
      await loadFromData(await response.arrayBuffer(), name)
    } catch (cause) {
      error.value = cause instanceof Error ? cause.message : String(cause)
      phase.value = 'error'
    }
  }

  function clear(): void {
    bundle.value = null
    report.value = null
    error.value = null
    progress.value = null
    sourceName.value = null
    phase.value = 'idle'
    useSettingsStore().selectedProfile = 'all'
  }

  return {
    bundle,
    report,
    phase,
    error,
    progress,
    sourceName,
    hasData,
    profiles,
    loadFromFile,
    loadFromUrl,
    clear,
  }
})
