function stars(score) {
  const filled = "★".repeat(score);
  const empty = "☆".repeat(Math.max(0, 5 - score));
  return filled + empty;
}

export function buildNotificationText(channelName, video, result) {
  const summaryLines = result.summary.map((line) => `・${line}`).join("\n");
  return [
    "【YouTube新着】",
    `${channelName}が新しい動画を公開しました。`,
    `「${video.title}」`,
    "📝 要約",
    summaryLines,
    `⭐ 重要度：${stars(result.importance)}`,
    `👀 視聴推奨：${stars(result.recommendation)}`,
    `▶ https://www.youtube.com/watch?v=${video.videoId}`,
  ].join("\n");
}

export async function notifyLine(text, accessToken, userId, { fetchImpl = fetch } = {}) {
  const res = await fetchImpl("https://api.line.me/v2/bot/message/push", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      to: userId,
      messages: [{ type: "text", text }],
    }),
  });
  if (!res.ok) {
    throw new Error(`LINE notify failed: ${res.status}`);
  }
}
