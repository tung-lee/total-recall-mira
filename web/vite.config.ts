import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@mira/money': fileURLToPath(new URL('../packages/money/src/index.ts', import.meta.url)) } },
  server: { port: 5173, proxy: { '/api': 'http://localhost:8787' } },
})
