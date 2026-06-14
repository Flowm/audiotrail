import { computed, type ComputedRef } from "vue";

import { useTakeoutStore } from "@/stores/takeout";
import type { DatasetKey, DatasetStatus } from "@/types/takeout";

export interface DatasetAvailability {
  status: ComputedRef<DatasetStatus | null>;
  available: ComputedRef<boolean>;
}

/** Per-dataset availability, so each view section can degrade gracefully. */
export function useDataset(key: DatasetKey): DatasetAvailability {
  const takeout = useTakeoutStore();
  const status = computed(() => takeout.report?.datasets.find((dataset) => dataset.key === key) ?? null);
  const available = computed(() => status.value?.status === "loaded" && status.value.rows > 0);
  return { status, available };
}
