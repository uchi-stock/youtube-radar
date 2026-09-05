/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import getAppVersionDefine from './getAppVersionDefine.js' // symlink

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // semantic-releaseがバージョンを更新するリポジトリルートのpackage.jsonを参照する
  // （frontend/package.jsonのversionは固定値のまま更新されないため）
  define: {
    ...getAppVersionDefine(new URL('../package.json', import.meta.url)),
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    env: {
      VITE_GOOGLE_CLIENT_ID: 'test-client-id',
      VITE_TRANSCRIPT_API_BASE_URL: 'https://api.example.com',
    },
  },
})
