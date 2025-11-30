import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  base: '/WebAppMgmt/',
  build: {
    rollupOptions: {
      onwarn(warning, warn) {
        // Suppress all warnings
        return;
      }
    }
  },
  esbuild: {
    logOverride: { 'this-is-undefined-in-esm': 'silent' }
  }
})
