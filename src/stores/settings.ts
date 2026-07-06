import { useLocalStorage } from "@vueuse/core";
import { defineStore } from "pinia";
import { ref, watch } from "vue";

const DARK_KEY = "audiotrail:dark";
const COVERS_KEY = "audiotrail:real-covers";

export const useSettingsStore = defineStore("settings", () => {
  const darkMode = useLocalStorage(DARK_KEY, window.matchMedia("(prefers-color-scheme: dark)").matches);
  const loadRealCovers = useLocalStorage(COVERS_KEY, false);
  const selectedProfile = ref<string>("all");

  watch(
    darkMode,
    (value) => {
      document.documentElement.classList.toggle("dark", value);
    },
    { immediate: true },
  );

  function toggleDark(): void {
    darkMode.value = !darkMode.value;
  }

  return { darkMode, loadRealCovers, selectedProfile, toggleDark };
});
