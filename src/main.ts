import { createPinia } from "pinia";
import { createApp } from "vue";

import { usePWAUpdate } from "@/composables/usePWAUpdate";

import "./style.css";
import App from "./App.vue";
import router from "./router";

createApp(App).use(createPinia()).use(router).mount("#app");

// Register the service worker; the update prompt is rendered by PWAUpdateBar.
usePWAUpdate();
