import { defineStore } from "pinia";
import { ref, watch } from "vue";

const DARK_KEY = "audiotrail:dark";
const COVERS_KEY = "audiotrail:real-covers";

// localStorage holds UI preferences only — never takeout data.
function readFlag(key: string): boolean | null {
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? null : stored === "1";
  } catch {
    return null;
  }
}

function writeFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, value ? "1" : "0");
  } catch {
    /* private mode — preference simply won't persist */
  }
}

export const useSettingsStore = defineStore("settings", () => {
  const darkMode = ref(readFlag(DARK_KEY) ?? window.matchMedia("(prefers-color-scheme: dark)").matches);
  const loadRealCovers = ref(readFlag(COVERS_KEY) ?? false);
  const selectedProfile = ref<string>("all");

  watch(
    darkMode,
    (value) => {
      document.documentElement.classList.toggle("dark", value);
      writeFlag(DARK_KEY, value);
    },
    { immediate: true },
  );

  watch(loadRealCovers, (value) => writeFlag(COVERS_KEY, value));

  function toggleDark(): void {
    darkMode.value = !darkMode.value;
  }

  return { darkMode, loadRealCovers, selectedProfile, toggleDark };
});
