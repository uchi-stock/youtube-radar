import path from "node:path";
import { fileURLToPath } from "node:url";
import { runPipeline } from "./pipeline.js";
import { loadProcessedVideoIds, saveProcessedVideoIds } from "./lib/store.js";
import { getAccessToken } from "./lib/googleAuth.js";
import { fetchSubscribedChannels } from "./lib/subscriptions.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));
const PROCESSED_PATH = path.join(dirname, "../data/processed-videos.json");

async function main() {
  const accessToken = await getAccessToken({
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
  });
  const channels = await fetchSubscribedChannels(accessToken);
  console.log(`チャンネル登録一覧を${channels.length}件取得しました`);

  const processedIds = await loadProcessedVideoIds(PROCESSED_PATH);

  const results = await runPipeline({
    channels,
    processedIds,
    env: process.env,
  });

  await saveProcessedVideoIds(PROCESSED_PATH, processedIds);

  const failed = results.filter((r) => r.status === "failed");
  console.log(`処理結果: 通知${results.length - failed.length}件 / 失敗${failed.length}件`);
  // 個別動画の失敗はプロセス全体の異常終了とは扱わない（次回実行でリトライする）。
}

main().catch((error) => {
  console.error("パイプライン実行中に予期しないエラーが発生しました:", error);
  process.exitCode = 1;
});
