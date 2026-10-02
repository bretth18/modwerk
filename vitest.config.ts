import { availableParallelism } from 'node:os'
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.mjs'],
    pool: 'threads',
    maxWorkers: Math.min(4, availableParallelism()),
    fileParallelism: true,
    isolate: true,
  },
})
