import { VIDEO_STATUS } from "./lib/dynamoStore.js";
import { summarizeTranscript } from "./lib/summarize.js";
import { buildNotificationText, notifyLine } from "./lib/line.js";
import { reportToJobSummary } from "./lib/report.js";

// AWSからYouTubeへの直接アクセスはHTTP 429で恒常的にブロックされるため、字幕取得自体は
// 自宅Raspberry Pi（家庭用IP）に委ねる。Raspberry Piは本モジュールが提供するAPIを介して
// (1) 未処理動画一覧を取得し、(2) 取得した字幕（または「字幕なし」）を送信する。

// Raspberry Piへ渡す未処理動画一覧（PENDING/RETRY_WAIT）を返す。
export async function getPendingVideos({ store, maxVideosPerRun = Infinity }) {
  const pending = await store.loadByStatus(VIDEO_STATUS.PENDING);
  const retryWait = await store.loadByStatus(VIDEO_STATUS.RETRY_WAIT);
  return [...pending, ...retryWait].slice(0, maxVideosPerRun);
}

// Raspberry Piから送られた字幕取得結果を受け取り、要約・LINE通知・状態更新まで行う。
// status: "NOT_FOUND"（字幕が存在しない）が明示された場合、またはtranscriptが無い場合は
// TRANSCRIPT_NOT_FOUNDとして記録する。
export async function submitTranscriptResult({ store, env, deps = {}, logger = console, videoId, transcript, status }) {
  if (!videoId) {
    throw new Error("videoId is required");
  }

  const item = await store.getStatus(videoId);
  if (!item) {
    return { videoId, status: "not_registered" };
  }
  const { channelName, title, publishedAt } = item;

  if (status === "NOT_FOUND" || !transcript) {
    await store.setStatus(videoId, VIDEO_STATUS.TRANSCRIPT_NOT_FOUND, { channelName, title, publishedAt });
    return { videoId, status: "not_found" };
  }

  try {
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
    return { videoId, status: "reported", lineNotified: lineConfigured };
  } catch (error) {
    logger.error(`[${videoId}] 処理に失敗しました: ${error.message}`);
    await store
      .setStatus(videoId, VIDEO_STATUS.FAILED, { channelName, title, publishedAt, error: error.message })
      .catch(() => {});
    return { videoId, status: "failed", error: error.message };
  }
}
