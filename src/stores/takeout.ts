import { defineStore } from 'pinia'
import { computed, ref, shallowRef } from 'vue'

import { audnexusRegion } from '@/lib/covers'
import { buildBookStats } from '@/lib/derive/books'
import { dailyTotals } from '@/lib/derive/time'
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

  // Derived, profile-filtered views. Cached computeds — they only re-run
  // when a new bundle is loaded or the selected profile changes.
  const sessions = computed(() => {
    const all = bundle.value?.listening ?? []
    const profile = useSettingsStore().selectedProfile
    return profile === 'all' ? all : all.filter((session) => session.profile === profile)
  })
  const days = computed(() => dailyTotals(sessions.value))
  const bookStats = computed(() => buildBookStats(sessions.value, bundle.value?.library ?? []))
  const accountInfo = computed(() => bundle.value?.account[0] ?? null)
  // Audnexus marketplace for opt-in cover lookups, derived from the account.
  const coverRegion = computed(() =>
    audnexusRegion(accountInfo.value?.countryCode, accountInfo.value?.marketplace),
  )

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
    sessions,
    days,
    bookStats,
    accountInfo,
    coverRegion,
    loadFromFile,
    loadFromUrl,
    clear,
  }
})
