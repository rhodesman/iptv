/// <reference types="vitest" />
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  root: 'app/web',
  plugins: [react()],
  server: { proxy: { '/api': 'http://localhost:4000' } },
  build: { outDir: 'dist', emptyOutDir: true },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: 'src/test/setup.ts',
    include: ['src/**/*.test.{ts,tsx}']
  }
})
