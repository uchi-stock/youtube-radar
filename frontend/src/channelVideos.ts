// タップされたチャンネルの最新動画一覧（再生回数等の簡単なサマリー付き）を取得する。
// バックエンドを介さず、ブラウザから直接YouTube Data APIを呼び出す（表示専用のため）。

export interface ChannelVideo {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
  viewCount: number;
}

interface ChannelsListResponse {
  items?: Array<{
    contentDetails?: { relatedPlaylists?: { uploads?: string } };
  }>;
}

interface PlaylistItemsListResponse {
  items?: Array<{
    snippet: {
      resourceId: { videoId: string };
      title: string;
      publishedAt: string;
      thumbnails?: { default?: { url?: string } };
    };
  }>;
}

interface VideosListResponse {
  items?: Array<{
    id: string;
    statistics?: { viewCount?: string };
  }>;
}

const CHANNELS_URL = "https://www.googleapis.com/youtube/v3/channels";
const PLAYLIST_ITEMS_URL = "https://www.googleapis.com/youtube/v3/playlistItems";
const VIDEOS_URL = "https://www.googleapis.com/youtube/v3/videos";

// タップ操作から表示までの体感速度を優先し、直近の最大件数のみを対象にする。
const MAX_VIDEOS = 10;

async function getUploadsPlaylistId(
  channelId: string,
  accessToken: string,
  fetchImpl: typeof fetch,
): Promise<string | null> {
  const params = new URLSearchParams({ part: "contentDetails", id: channelId });
  const res = await fetchImpl(`${CHANNELS_URL}?${params.toString()}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`チャンネル情報の取得に失敗しました: HTTP ${res.status}`);
  }
  const data: ChannelsListResponse = await res.json();
  return data.items?.[0]?.contentDetails?.relatedPlaylists?.uploads ?? null;
}

async function getRecentVideos(
  uploadsPlaylistId: string,
  accessToken: string,
  fetchImpl: typeof fetch,
): Promise<Omit<ChannelVideo, "viewCount">[]> {
  const params = new URLSearchParams({
    part: "snippet",
    playlistId: uploadsPlaylistId,
    maxResults: String(MAX_VIDEOS),
  });
  const res = await fetchImpl(`${PLAYLIST_ITEMS_URL}?${params.toString()}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`動画一覧の取得に失敗しました: HTTP ${res.status}`);
  }
  const data: PlaylistItemsListResponse = await res.json();
  return (data.items ?? []).map((item) => ({
    videoId: item.snippet.resourceId.videoId,
    title: item.snippet.title,
    thumbnailUrl: item.snippet.thumbnails?.default?.url ?? "",
    publishedAt: item.snippet.publishedAt,
  }));
}

async function getViewCounts(
  videoIds: string[],
  accessToken: string,
  fetchImpl: typeof fetch,
): Promise<Map<string, number>> {
  if (videoIds.length === 0) {
    return new Map();
  }
  const params = new URLSearchParams({ part: "statistics", id: videoIds.join(",") });
  const res = await fetchImpl(`${VIDEOS_URL}?${params.toString()}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`再生回数の取得に失敗しました: HTTP ${res.status}`);
  }
  const data: VideosListResponse = await res.json();
  return new Map((data.items ?? []).map((item) => [item.id, Number(item.statistics?.viewCount ?? 0)]));
}

export async function fetchChannelVideos(
  channelId: string,
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ChannelVideo[]> {
  const uploadsPlaylistId = await getUploadsPlaylistId(channelId, accessToken, fetchImpl);
  if (!uploadsPlaylistId) {
    return [];
  }

  const videos = await getRecentVideos(uploadsPlaylistId, accessToken, fetchImpl);
  const viewCounts = await getViewCounts(
    videos.map((v) => v.videoId),
    accessToken,
    fetchImpl,
  );

  return videos.map((video) => ({ ...video, viewCount: viewCounts.get(video.videoId) ?? 0 }));
}
