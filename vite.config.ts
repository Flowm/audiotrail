/// <reference types="vitest/config" />
import { createReadStream, existsSync, statSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'

import tailwindcss from '@tailwindcss/vite'
import vue from '@vitejs/plugin-vue'
import { defineConfig, type Plugin } from 'vite'

/**
 * Serves the developer's own gitignored sample takeout (data/Audible.zip)
 * at /__sample/Audible.zip during `vite serve` only. `apply: 'serve'` means
 * the middleware does not exist in builds, so real data can never ship.
 */
function sampleZipPlugin(): Plugin {
  return {
    name: 'audiotrail:sample-zip',
    apply: 'serve',
    configureServer(server) {
      server.middlewares.use('/__sample/Audible.zip', (req, res) => {
        const zipPath = resolve(import.meta.dirname, 'data/Audible.zip')
        if (!existsSync(zipPath)) {
          res.statusCode = 404
          res.end('No sample zip at data/Audible.zip')
          return
        }
        res.setHeader('Content-Type', 'application/zip')
        res.setHeader('Content-Length', String(statSync(zipPath).size))
        if (req.method === 'HEAD') {
          res.end()
          return
        }
        createReadStream(zipPath).pipe(res)
      })
    },
  }
}

export default defineConfig({
  plugins: [vue(), tailwindcss(), sampleZipPlugin()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
