import { createPinia } from "pinia";
import { createApp } from "vue";

import App from "./App.vue";

import "./assets/main.css";
import { usePWAUpdate } from "./composables/usePWAUpdate";
import router from "./router";

// Register the service worker; the update prompt is rendered by PWAUpdateBar.
usePWAUpdate();

createApp(App).use(createPinia()).use(router).mount("#app");
