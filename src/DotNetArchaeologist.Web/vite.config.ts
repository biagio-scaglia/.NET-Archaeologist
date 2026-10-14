import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:5123',
        changeOrigin: true
      },
      '/health': {
        target: 'http://127.0.0.1:5123',
        changeOrigin: true
      }
    }
  },
  build: {
    cssMinify: false,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('node_modules')) {
            if (id.includes('react') || id.includes('react-dom')) {
              return 'vendor-react'
            }
          }
          if (id.includes('theme') || id.includes('98.css') || id.includes('xp.css') || id.includes('7.css')) {
            return 'retro-themes'
          }
        }
      }
    }
  },
  // @ts-ignore vitest config
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/setupTests.ts'
  }
})
