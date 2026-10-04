import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { modulePages } from './scripts/module-pages.ts'

export default defineConfig({
  plugins: [react(), modulePages()],
  base: './',
  server: { fs: { deny: ['.env', '.env.*', '.dev.vars', '.dev.vars.*', '**/*.crt', '**/*.pem', '**/*.key', '**/*.bin', '**/*.syx', '**/.git/**', '**/downloads/**', '**/out/**'] }, port: 5173, strictPort: true, proxy: { '/api': 'http://127.0.0.1:8788' } },
  build: { sourcemap: false },
})
