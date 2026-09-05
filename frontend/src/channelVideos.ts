// タップされたチャンネルの最新動画一覧（再生回数等の簡単なサマリー付き）を取得する。
// バックエンドを介さず、ブラウザから直接YouTube Data APIを呼び出す（表示専用のため）。

export interface ChannelVideo {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  publishedAt: string;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  description: string;
  duration: string;
  captionAvailable: boolean;
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
    snippet?: { description?: string };
    contentDetails?: { duration?: string; caption?: string };
    statistics?: { viewCount?: string; likeCount?: string; commentCount?: string };
  }>;
}

interface VideoStatDetail {
  viewCount: number;
  likeCount: number;
  commentCount: number;
  description: string;
  duration: string;
  captionAvailable: boolean;
}

const EMPTY_DETAIL: VideoStatDetail = {
  viewCount: 0,
  likeCount: 0,
  commentCount: 0,
  description: "",
  duration: "",
  captionAvailable: false,
};

// ISO 8601形式（例: "PT1H2M3S"）の動画の長さを秒数に変換する。
function parseIsoDuration(duration: string): number {
  const match = duration.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/);
  if (!match) {
    return 0;
  }
  const [, hours, minutes, seconds] = match;
  return Number(hours ?? 0) * 3600 + Number(minutes ?? 0) * 60 + Number(seconds ?? 0);
}

function formatDuration(totalSeconds: number): string {
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const paddedSeconds = String(seconds).padStart(2, "0");
  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${paddedSeconds}`;
  }
  return `${minutes}:${paddedSeconds}`;
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
): Promise<Pick<ChannelVideo, "videoId" | "title" | "thumbnailUrl" | "publishedAt">[]> {
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

async function getVideoDetailsMap(
  videoIds: string[],
  accessToken: string,
  fetchImpl: typeof fetch,
): Promise<Map<string, VideoStatDetail>> {
  if (videoIds.length === 0) {
    return new Map();
  }
  const params = new URLSearchParams({ part: "snippet,contentDetails,statistics", id: videoIds.join(",") });
  const res = await fetchImpl(`${VIDEOS_URL}?${params.toString()}`, {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) {
    throw new Error(`動画メタ情報の取得に失敗しました: HTTP ${res.status}`);
  }
  const data: VideosListResponse = await res.json();
  return new Map(
    (data.items ?? []).map((item) => [
      item.id,
      {
        viewCount: Number(item.statistics?.viewCount ?? 0),
        likeCount: Number(item.statistics?.likeCount ?? 0),
        commentCount: Number(item.statistics?.commentCount ?? 0),
        description: item.snippet?.description ?? "",
        duration: formatDuration(parseIsoDuration(item.contentDetails?.duration ?? "")),
        captionAvailable: item.contentDetails?.caption === "true",
      },
    ]),
  );
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
  const details = await getVideoDetailsMap(
    videos.map((v) => v.videoId),
    accessToken,
    fetchImpl,
  );

  return videos.map((video) => ({ ...video, ...(details.get(video.videoId) ?? EMPTY_DETAIL) }));
}
