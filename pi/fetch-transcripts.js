#!/usr/bin/env node
// 自宅Raspberry Pi用エントリポイント。cron等での定期実行を想定。
// セットアップ手順はpi/README.mdを参照。

const { run } = require("./lib.js");

if (require.main === module) {
  const apiBaseUrl = process.env.API_BASE_URL;
  const apiKey = process.env.PI_API_KEY;

  if (!apiBaseUrl || !apiKey) {
    console.error("API_BASE_URLとPI_API_KEYの環境変数が必要です");
    process.exit(1);
  }

  run({ apiBaseUrl, apiKey }).catch((error) => {
    console.error(`実行に失敗しました: ${error.message}`);
    process.exit(1);
  });
}
