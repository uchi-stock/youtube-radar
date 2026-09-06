// ログイン成功時に取得済みのチャンネル一覧をbackendへ同期する（POST /channels）。
// backend側はアクセストークンから取得したメールアドレスをキーに、そのユーザー
// 自身の行として永続化し、discover Lambda（新着検知）がそこから処理する。
// ベストエフォートで行い、失敗してもログイン自体は失敗させない（呼び出し側で
// try/catchし、エラーはコンソールへログ出力する程度に留める）。

import type { SubscribedChannel } from "./youtubeApi";

export async function syncChannels(
  channels: SubscribedChannel[],
  accessToken: string,
  apiBaseUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<void> {
  const body = {
    channels: channels.map((channel) => ({
      channelId: channel.channelId,
      name: channel.title,
      enabled: true,
    })),
  };

  const res = await fetchImpl(`${apiBaseUrl.replace(/\/$/, "")}/channels`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`チャンネル一覧の同期に失敗しました: HTTP ${res.status}`);
  }
}
