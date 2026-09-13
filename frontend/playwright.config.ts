import { defineConfig, devices } from "@playwright/test";

// frontendはバックエンドを介さない表示専用のVite SPA。E2Eはビルド成果物を
// vite previewで配信して実行する（reusable-ci.ymlのfrontend-e2e-testジョブは
// このconfigの前にnpm run buildを別ステップとして実行済みの前提）。
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html"],
    [
      "monocart-reporter",
      {
        name: "youtube-radar frontend E2E Report",
        outputFile: "./monocart-report/index.html",
        coverage: {
          // frontend-testと同じパス・形式（coverage/coverage-summary.json）に出力する
          // （check-coverage-threshold複合actionの既定、docs/e2e-coverage-pattern.md参照）
          outputDir: "./coverage",
          reports: [["json-summary"], ["console-summary"]],
          // ビルド成果物（自プロダクトのオリジン配下のみ）を対象にする
          entryFilter: (entry: { url: string }) => entry.url.includes("localhost:4173"),
          // node_modules（依存パッケージのソース）を除外し、src/配下のみを対象にする
          sourceFilter: {
            "**/node_modules/**": false,
            "src/**": true,
          },
        },
      },
    ],
  ],
  use: {
    baseURL: "http://localhost:4173",
    trace: "on-first-retry",
    // ローカルにインストール済みのChromiumを使う場合に、npx playwright installを
    // 省略できるようにするための任意設定。未設定時はPlaywright既定の（installした）
    // 実行ファイルを使う
    launchOptions: process.env.E2E_CHROMIUM_EXECUTABLE_PATH
      ? { executablePath: process.env.E2E_CHROMIUM_EXECUTABLE_PATH }
      : {},
  },
  webServer: {
    command: "npm run preview -- --port 4173",
    url: "http://localhost:4173",
    reuseExistingServer: !process.env.CI,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
