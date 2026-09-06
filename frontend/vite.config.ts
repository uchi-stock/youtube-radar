/// <reference types="vitest/config" />
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import getAppVersionDefine from './getAppVersionDefine.js' // symlink

// dev-standards共通のfrontend-e2e-testジョブは、npm run build後にsecretsを
// $GITHUB_ENVへ展開する（E2E_SECRETS_JSON、issue #371）ため、ビルド時点では
// VITE_GOOGLE_CLIENT_IDを渡す手段が無い。App.tsxはこれが未設定だとログイン
// ボタンクリック時に即エラー表示してGoogle Identity Servicesの呼び出し自体を
// 行わないため、E2Eでログイン後の画面を検証できるよう、CI環境かつ未設定の場合
// のみ非秘匿なダミー値を補う。ローカル開発（npm run dev/build）では引き続き
// 未設定のままエラー表示させ、設定漏れに気付けるようにする。本番デプロイ
// （cd.ymlのdeploy-frontend job）は実際のClient IDをprocess.envへ設定済みの
// ため上書きされない（Vite・dotenvは既存のprocess.env値を優先する）。
if (process.env.CI && !process.env.VITE_GOOGLE_CLIENT_ID) {
  process.env.VITE_GOOGLE_CLIENT_ID = 'e2e-dummy-client-id'
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // semantic-releaseがバージョンを更新するリポジトリルートのpackage.jsonを参照する
  // （frontend/package.jsonのversionは固定値のまま更新されないため）
  define: {
    ...getAppVersionDefine(new URL('../package.json', import.meta.url)),
  },
  // ShareButton.jsx（symlink経由の共有コンポーネント）がqrcode.reactをimportするため、
  // シンボリックリンクの実体パス起点でnode_modulesを探索させないようにする
  // （docs/shared-ui-components.md「ShareButton.jsx」参照）。
  resolve: {
    preserveSymlinks: true,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/setupTests.ts'],
    // e2e/配下はPlaywright専用のスペックファイル（@playwright/testに依存）で
    // vitestの対象ではないため、既定のincludeパターンから除外する
    exclude: ['**/node_modules/**', 'e2e/**'],
    env: {
      VITE_GOOGLE_CLIENT_ID: 'test-client-id',
      VITE_TRANSCRIPT_API_BASE_URL: 'https://api.example.com',
    },
  },
})
