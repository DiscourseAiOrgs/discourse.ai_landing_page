import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 5173,
  },
  preview: {
    host: true,
    port: 3000,
    allowedHosts: ['cortify-ai-landing.5.161.237.174.sslip.io'],
  },
})