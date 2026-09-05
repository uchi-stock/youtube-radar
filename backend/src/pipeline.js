import { fetchLatestVideos } from "./lib/youtube.js";
import { fetchTranscript } from "./lib/transcript.js";
import { summarizeTranscript } from "./lib/summarize.js";
import { buildNotificationText, notifyLine } from "./lib/line.js";
import { reportToJobSummary } from "./lib/report.js";

// 1動画の処理失敗でパイプライン全体を止めない。失敗した動画は処理済みに
// マークせず、次回実行時に再度検知・リトライする。
//
// maxVideosPerRun: 1回の実行でTranscript取得を試みる動画数の上限。429がアクセス制限である
// 可能性を踏まえ、1回の実行で大量アクセスしないよう制限する。上限を超えた分は処理済みに
// マークしないため、次回実行時に持ち越される。
export async function runPipeline({
  channels,
  processedIds,
  markProcessed,
  env,
  deps = {},
  logger = console,
  maxVideosPerRun = Infinity,
}) {
  const results = [];
  let attemptedCount = 0;

  for (const channel of channels.filter((c) => c.enabled)) {
    if (attemptedCount >= maxVideosPerRun) {
      logger.warn?.(
        `1回の実行あたりの処理件数上限（${maxVideosPerRun}件）に達したため、残りのチャンネルは次回実行に持ち越します`,
      );
      break;
    }
    let videos;
    try {
      videos = await fetchLatestVideos(channel.channelId, env.YOUTUBE_API_KEY, deps);
    } catch (error) {
      logger.error(`[${channel.name}] 新着動画の取得に失敗しました: ${error.message}`);
      continue;
    }

    for (const video of videos) {
      if (processedIds.has(video.videoId)) {
        continue;
      }
      if (attemptedCount >= maxVideosPerRun) {
        logger.warn?.(
          `1回の実行あたりの処理件数上限（${maxVideosPerRun}件）に達したため、残りの未処理動画は次回実行に持ち越します`,
        );
        break;
      }
      attemptedCount += 1;
      try {
        const { status, transcript } = await fetchTranscript(video.videoId, { ...deps, logger });
        if (status !== "OK") {
          logger.warn(`[${video.videoId}] 文字起こしを取得できませんでした（${status}）。スキップします`);
          continue;
        }
        const summary = await summarizeTranscript(video.title, transcript, env.GEMINI_API_KEY, deps);
        const text = buildNotificationText(channel.name, video, summary);
        await reportToJobSummary(text, deps);

        const lineConfigured = Boolean(env.LINE_CHANNEL_ACCESS_TOKEN && env.LINE_USER_ID);
        if (lineConfigured) {
          await notifyLine(text, env.LINE_CHANNEL_ACCESS_TOKEN, env.LINE_USER_ID, deps);
        } else {
          logger.warn?.(`[${video.videoId}] LINE_CHANNEL_ACCESS_TOKEN/LINE_USER_ID未設定のためLINE通知をスキップしました`);
        }

        processedIds.add(video.videoId);
        await markProcessed(video.videoId);
        results.push({ videoId: video.videoId, status: "reported", lineNotified: lineConfigured });
      } catch (error) {
        logger.error(`[${video.videoId}] 処理に失敗しました: ${error.message}`);
        results.push({ videoId: video.videoId, status: "failed", error: error.message });
      }
    }
  }
  return results;
}
