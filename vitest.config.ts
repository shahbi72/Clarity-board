import path from 'node:path'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  test: {
    dir: 'tests',
    include: ['**/*.test.{ts,tsx}'],
    environment: 'jsdom',
    setupFiles: ['./tests/vitest.setup.ts'],
    exclude: ['e2e/**'],
    pool: 'forks',
    fileParallelism: false,
  },
})
