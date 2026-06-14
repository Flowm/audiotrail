/// <reference types="vitest/config" />
import { createReadStream, existsSync, statSync } from "node:fs";
import { resolve } from "node:path";

import tailwindcss from "@tailwindcss/vite";
import vue from "@vitejs/plugin-vue";
import { defineConfig, type Plugin } from "vite";
import { VitePWA } from "vite-plugin-pwa";

/**
 * Serves the developer's own gitignored sample takeout (data/Audible.zip)
 * at /__sample/Audible.zip during `vite serve` only. `apply: 'serve'` means
 * the middleware does not exist in builds, so real data can never ship.
 */
function sampleZipPlugin(): Plugin {
  return {
    name: "audiotrail:sample-zip",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use("/__sample/Audible.zip", (req, res) => {
        const zipPath = resolve(import.meta.dirname, "data/Audible.zip");
        if (!existsSync(zipPath)) {
          res.statusCode = 404;
          res.end("No sample zip at data/Audible.zip");
          return;
        }
        res.setHeader("Content-Type", "application/zip");
        res.setHeader("Content-Length", String(statSync(zipPath).size));
        if (req.method === "HEAD") {
          res.end();
          return;
        }
        createReadStream(zipPath).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [
    vue(),
    tailwindcss(),
    sampleZipPlugin(),
    VitePWA({
      registerType: "prompt",
      manifest: {
        name: "Audiotrail",
        short_name: "Audiotrail",
        description: "Turn your Audible data takeout into a private dashboard, parsed entirely in your browser.",
        theme_color: "#c96a15",
        background_color: "#faf8f4",
        display: "standalone",
        start_url: "/",
        scope: "/",
        id: "audiotrail",
        orientation: "natural",
      },
      workbox: {
        // Precache only the built app shell. User-imported Audible data is never
        // a network resource, so it is never cached by the service worker.
        globPatterns: ["**/*.{js,css,html,svg,png,ico,woff,woff2}"],
      },
      pwaAssets: {
        htmlPreset: "2023",
        preset: {
          transparent: { sizes: [64, 192, 512], favicons: [[48, "favicon.ico"]] },
          maskable: { sizes: [512], padding: 0.15, resizeOptions: { background: "#c96a15" } },
          apple: { sizes: [180], padding: 0.15, resizeOptions: { background: "#c96a15" } },
        },
        image: "public/logo.svg",
      },
      devOptions: {
        type: "module",
      },
    }),
  ],
  resolve: {
    tsconfigPaths: true,
  },
  build: {
    // echarts is one deliberate lazy-loaded chunk shared by all chart views;
    // it never blocks the upload page. ~245 kB gzip is its expected size.
    chunkSizeWarningLimit: 800,
    rolldownOptions: {
      output: {
        // Vite 8 runs on Rolldown, where the object form of manualChunks is
        // gone; codeSplitting.groups is its replacement. captured modules pull
        // in their deps by default, so echarts' zrender lands here too.
        codeSplitting: {
          groups: [
            { name: "vue", test: /@vue|vue-router|pinia|@vueuse/, priority: 60 },
            { name: "echarts", test: /echarts|vue-echarts/, priority: 30 },
            { name: "vendor", test: /node_modules/, priority: 10 },
            { name: "app", test: /src/, priority: 1 },
          ],
        },
      },
    },
  },
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
