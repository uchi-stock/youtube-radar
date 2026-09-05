import { runPipeline } from "./pipeline.js";
import { createStore } from "./lib/dynamoStore.js";
import { getAccessToken } from "./lib/googleAuth.js";
import { fetchSubscribedChannels } from "./lib/subscriptions.js";

export async function handler() {
  const accessToken = await getAccessToken({
    clientId: process.env.GOOGLE_OAUTH_CLIENT_ID,
    clientSecret: process.env.GOOGLE_OAUTH_CLIENT_SECRET,
    refreshToken: process.env.GOOGLE_OAUTH_REFRESH_TOKEN,
  });
  const channels = await fetchSubscribedChannels(accessToken);
  console.log(`チャンネル登録一覧を${channels.length}件取得しました`);

  const store = createStore(process.env.PROCESSED_VIDEOS_TABLE);
  const processedIds = await store.loadProcessedIds();

  const results = await runPipeline({
    channels,
    processedIds,
    markProcessed: (videoId) => store.markProcessed(videoId),
    env: process.env,
    deps: {
      retry: {
        maxRetries: Number(process.env.TRANSCRIPT_RETRY_MAX ?? 2),
        baseDelayMs: Number(process.env.TRANSCRIPT_RETRY_BASE_DELAY_MS ?? 500),
      },
    },
    maxVideosPerRun: Number(process.env.TRANSCRIPT_BATCH_SIZE ?? 5),
  });

  const failed = results.filter((r) => r.status === "failed");
  console.log(`処理結果: 通知${results.length - failed.length}件 / 失敗${failed.length}件`);
  // 個別動画の失敗はLambda全体の異常終了とは扱わない（次回実行でリトライする）。
  return { notified: results.length - failed.length, failed: failed.length };
}
