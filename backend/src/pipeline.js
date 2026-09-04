import { fetchLatestVideos } from "./lib/youtube.js";
import { fetchTranscript } from "./lib/transcript.js";
import { summarizeTranscript } from "./lib/summarize.js";
import { buildNotificationText, notifyLine } from "./lib/line.js";
import { reportToJobSummary } from "./lib/report.js";

// 1動画の処理失敗でパイプライン全体を止めない。失敗した動画は処理済みに
// マークせず、次回実行時に再度検知・リトライする。
export async function runPipeline({ channels, processedIds, env, deps = {}, logger = console }) {
  const results = [];
  for (const channel of channels.filter((c) => c.enabled)) {
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
      try {
        const transcript = await fetchTranscript(video.videoId, { ...deps, logger });
        if (!transcript) {
          logger.warn(`[${video.videoId}] 文字起こしを取得できませんでした。スキップします`);
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
        results.push({ videoId: video.videoId, status: "reported", lineNotified: lineConfigured });
      } catch (error) {
        logger.error(`[${video.videoId}] 処理に失敗しました: ${error.message}`);
        results.push({ videoId: video.videoId, status: "failed", error: error.message });
      }
    }
  }
  return results;
}
