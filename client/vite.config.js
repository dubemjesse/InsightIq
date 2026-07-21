import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // jsPDF references the Node-only `process.env` global; Vite doesn't
  // polyfill Node globals, so shim it to avoid a runtime crash in the browser.
  define: {
    'process.env': {},
  },
})
