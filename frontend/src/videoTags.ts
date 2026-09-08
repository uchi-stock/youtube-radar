// チャンネルの動画一覧画面でのタグ絞り込み用に、複数動画のタグをまとめて
// 自社バックエンドAPI（GET /videos?ids=...）から取得する。videoDetail.tsと同様、
// 読み取り専用の公開エンドポイントのため認証は不要。

interface VideosByIdsResponse {
  videos: Array<{ videoId: string; tags?: string[] }>;
}

// videoIdをキーとしたタグ一覧のマップを返す。未登録・タグ無しの動画は空配列になる。
export async function fetchVideoTags(
  videoIds: string[],
  apiBaseUrl: string,
  fetchImpl: typeof fetch = fetch,
): Promise<Map<string, string[]>> {
  if (videoIds.length === 0) {
    return new Map();
  }
  const params = new URLSearchParams({ ids: videoIds.join(",") });
  const res = await fetchImpl(`${apiBaseUrl.replace(/\/$/, "")}/videos?${params.toString()}`);
  if (!res.ok) {
    throw new Error(`動画タグの取得に失敗しました: HTTP ${res.status}`);
  }
  const data: VideosByIdsResponse = await res.json();
  const map = new Map<string, string[]>();
  for (const video of data.videos ?? []) {
    map.set(video.videoId, video.tags ?? []);
  }
  return map;
}
