import fs from 'node:fs'
import { fileURLToPath, URL } from 'node:url'

import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'

const useHttps = String(process.env.VITE_DEV_HTTPS || '').toLowerCase() === 'true'
const httpsKeyPath = process.env.VITE_DEV_SSL_KEY
const httpsCertPath = process.env.VITE_DEV_SSL_CERT

function getHttpsConfig() {
  if (!useHttps) return undefined
  if (!httpsKeyPath || !httpsCertPath) return {}
  if (!fs.existsSync(httpsKeyPath) || !fs.existsSync(httpsCertPath)) {
    return {}
  }

  return {
    key: fs.readFileSync(httpsKeyPath),
    cert: fs.readFileSync(httpsCertPath)
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    vue(),
  ],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url))
    },
  },
  server: {
    port: 5173,
    host: true,
    allowedHosts: ['.trycloudflare.com'],
    https: getHttpsConfig()
  }
})
