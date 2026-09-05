import { fetchTranscript, TRANSCRIPT_ACCESS_LIMITED } from "./lib/transcript.js";
import { summarizeTranscript } from "./lib/summarize.js";
import { buildNotificationText, notifyLine } from "./lib/line.js";
import { reportToJobSummary } from "./lib/report.js";
import { VIDEO_STATUS } from "./lib/dynamoStore.js";

// DynamoDBのPENDING/RETRY_WAIT動画のみを対象に、字幕取得〜要約〜LINE通知まで行う。
// 新着検知（discovery.js）とは別Lambdaとして実行することを想定している。
//
// maxVideosPerRun: 1回の実行で処理する動画数の上限。429がアクセス制限である可能性を踏まえ、
// 1回の実行で大量アクセスしないよう制限する。上限を超えた分はRETRY_WAIT/PENDINGのまま
// 残るため、次回実行時に持ち越される。
export async function runTranscriptWorker({
  store,
  env,
  deps = {},
  logger = console,
  maxVideosPerRun = Infinity,
}) {
  const pending = await store.loadByStatus(VIDEO_STATUS.PENDING);
  const retryWait = await store.loadByStatus(VIDEO_STATUS.RETRY_WAIT);
  const candidates = [...pending, ...retryWait].slice(0, maxVideosPerRun);

  const results = [];
  for (const item of candidates) {
    const { videoId, channelName, title, publishedAt } = item;
    try {
      const { status, transcript } = await fetchTranscript(videoId, { ...deps, logger });

      if (status === TRANSCRIPT_ACCESS_LIMITED) {
        logger.warn(`[${videoId}] アクセス制限のため今回は保留し、次回実行で再試行します`);
        await store.setStatus(videoId, VIDEO_STATUS.RETRY_WAIT, { channelName, title, publishedAt });
        results.push({ videoId, status: "retry_wait" });
        continue;
      }
      if (status !== "OK") {
        logger.warn(`[${videoId}] 文字起こしを取得できませんでした（${status}）`);
        await store.setStatus(videoId, VIDEO_STATUS.TRANSCRIPT_NOT_FOUND, { channelName, title, publishedAt });
        results.push({ videoId, status: "not_found" });
        continue;
      }

      const summary = await summarizeTranscript(title, transcript, env.GEMINI_API_KEY, deps);
      const text = buildNotificationText(channelName, { videoId, title }, summary);
      await reportToJobSummary(text, deps);

      const lineConfigured = Boolean(env.LINE_CHANNEL_ACCESS_TOKEN && env.LINE_USER_ID);
      if (lineConfigured) {
        await notifyLine(text, env.LINE_CHANNEL_ACCESS_TOKEN, env.LINE_USER_ID, deps);
      } else {
        logger.warn?.(`[${videoId}] LINE_CHANNEL_ACCESS_TOKEN/LINE_USER_ID未設定のためLINE通知をスキップしました`);
      }

      await store.setStatus(videoId, VIDEO_STATUS.COMPLETED, { channelName, title, publishedAt });
      results.push({ videoId, status: "reported", lineNotified: lineConfigured });
    } catch (error) {
      logger.error(`[${videoId}] 処理に失敗しました: ${error.message}`);
      await store
        .setStatus(videoId, VIDEO_STATUS.FAILED, { channelName, title, publishedAt, error: error.message })
        .catch(() => {});
      results.push({ videoId, status: "failed", error: error.message });
    }
  }
  return results;
}
