import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig(({ command }) => ({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: {
        enabled: false  // 開發模式下停用 PWA
      },
      includeAssets: [
        'favicon.svg',
        'icons/icon-192.svg',
        'icons/icon-512.svg'
      ],
      manifest: {
        name: 'NonBlockingLife',
        short_name: 'NBL',
        description: 'NonBlockingLife local-first task manager',
        start_url: '/NonBlockingLife/',
        scope: '/NonBlockingLife/',
        display: 'standalone',
        background_color: '#0f172a',
        theme_color: '#0f172a',
        orientation: 'portrait-primary',
        icons: [
          {
            src: 'icons/icon-192.svg',
            sizes: '192x192',
            type: 'image/svg+xml',
            purpose: 'any'
          },
          {
            src: 'icons/icon-512.svg',
            sizes: '512x512',
            type: 'image/svg+xml',
            purpose: 'any'
          }
        ]
      }
    })
  ],
  base: command === 'serve' ? '/' : '/NonBlockingLife/',
}))
