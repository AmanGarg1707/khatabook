import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  base: '/khatabook/',
  plugins: [
    tailwindcss(),
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      devOptions: { enabled: true },
      manifest: {
        name: 'Khatabook',
        short_name: 'Khatabook',
        theme_color: '#6366f1',
        background_color: '#ffffff',
        display: 'standalone',
        start_url: '/khatabook/',
        icons: [
          { src: '/khatabook/icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/khatabook/icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
