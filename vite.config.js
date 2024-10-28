import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import { VitePWA } from 'vite-plugin-pwa';

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      manifest: {
        name: "Beezer Api",
        short_name: "Api",
        description: "Deezer Api Charles Ans",
        lang: "es-ES",
        display: "standalone",
        display_override: ["window-controls-overlay"],
        theme_color: "#ffffff",
        background_color: "#ffffff",
        icons: [
          {
            src: "/Icons/smile-192x192.png",
            sizes: "192x192",
            type: "image/png",
            purpose: "any"
          },
          {
            src: "/Icons/smile-512x512.png",
            sizes: "512x512",
            type: "image/png",
            purpose: "maskable"
          }
        ]
      }
    })
  ],
  server: {
    proxy: {
      '/deezer': {
        target: 'https://api.deezer.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/deezer/, '')
      }
    }
  }
})
