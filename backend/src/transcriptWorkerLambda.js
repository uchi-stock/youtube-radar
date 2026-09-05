import { runTranscriptWorker } from "./transcriptWorker.js";
import { createStore } from "./lib/dynamoStore.js";

// Transcript Worker用Lambda。discovery.js（lambda.js）が登録したPENDING/RETRY_WAIT動画を
// DynamoDBから読み取り、字幕取得〜要約〜LINE通知まで行う。
export async function handler() {
  const store = createStore(process.env.PROCESSED_VIDEOS_TABLE);

  const results = await runTranscriptWorker({
    store,
    env: process.env,
    deps: {
      retry: {
        maxRetries: Number(process.env.TRANSCRIPT_RETRY_MAX ?? 2),
        baseDelayMs: Number(process.env.TRANSCRIPT_RETRY_BASE_DELAY_MS ?? 500),
      },
    },
    maxVideosPerRun: Number(process.env.TRANSCRIPT_BATCH_SIZE ?? 5),
  });

  const countOf = (status) => results.filter((r) => r.status === status).length;
  console.log(
    `Transcript Worker処理結果: 通知${countOf("reported")}件 / 保留${countOf("retry_wait")}件 / 字幕なし${countOf("not_found")}件 / 失敗${countOf("failed")}件`,
  );
  return {
    reported: countOf("reported"),
    retryWait: countOf("retry_wait"),
    notFound: countOf("not_found"),
    failed: countOf("failed"),
  };
}
