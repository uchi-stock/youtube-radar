import { fetchLatestVideos } from "./lib/youtube.js";
import { VIDEO_STATUS } from "./lib/dynamoStore.js";

// 新着検知のみを行う。字幕取得・要約・LINE通知は行わない（Transcript Workerが別途処理する）。
// これにより、字幕取得側のHTTP 429（アクセス制限）が新着検知に影響しない構成にする。
export async function runDiscovery({ channels, store, env, deps = {}, logger = console }) {
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
      const existing = await store.getStatus(video.videoId);
      if (existing) {
        continue;
      }
      await store.setStatus(video.videoId, VIDEO_STATUS.PENDING, {
        channelName: channel.name,
        title: video.title,
        publishedAt: video.publishedAt,
      });
      results.push({ videoId: video.videoId, status: "pending" });
    }
  }
  return results;
}
