#!/usr/bin/env node
// 自宅Raspberry Pi用エントリポイント。cron等での定期実行を想定。
// セットアップ手順はpi/README.mdを参照。

const { chromium } = require("playwright");
const { run } = require("./lib.js");

// ヘッドレスブラウザとして振る舞うことで、YouTube側のCookieセッション・bot対策を
// 経由した状態でアクセスする（Issue #118）。
const WATCH_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

async function main() {
  const apiBaseUrl = process.env.API_BASE_URL;
  const apiKey = process.env.PI_API_KEY;

  if (!apiBaseUrl || !apiKey) {
    console.error("API_BASE_URLとPI_API_KEYの環境変数が必要です");
    process.exit(1);
  }

  const browser = await chromium.launch();
  try {
    // ブラウザコンテキストを1回の実行で使い回すことで、Cookieセッションを動画間で
    // 共有する。動画ごとにページのみ新規作成する。
    const context = await browser.newContext({ userAgent: WATCH_USER_AGENT, locale: "ja-JP" });
    await run({ apiBaseUrl, apiKey, newPage: () => context.newPage() });
  } finally {
    await browser.close();
  }
}

if (require.main === module) {
  main().catch((error) => {
    console.error(`実行に失敗しました: ${error.message}`);
    process.exit(1);
  });
}
