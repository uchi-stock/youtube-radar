// ログイン中のGoogleアカウントのYouTube登録チャンネル一覧を取得する。
// バックエンドを介さず、ブラウザから直接YouTube Data APIを呼び出す（表示専用のため）。

export interface SubscribedChannel {
  channelId: string;
  title: string;
  thumbnailUrl: string;
}

interface SubscriptionsListResponse {
  items?: Array<{
    snippet: {
      resourceId: { channelId: string };
      title: string;
      thumbnails?: { default?: { url?: string } };
    };
  }>;
  nextPageToken?: string;
}

const SUBSCRIPTIONS_URL = "https://www.googleapis.com/youtube/v3/subscriptions";

// 1回のリクエストで取得できる件数の上限（YouTube Data APIの仕様）。
const MAX_RESULTS_PER_PAGE = 50;

export async function fetchSubscribedChannels(
  accessToken: string,
  fetchImpl: typeof fetch = fetch,
): Promise<SubscribedChannel[]> {
  const channels: SubscribedChannel[] = [];
  let pageToken: string | undefined;

  do {
    const params = new URLSearchParams({
      part: "snippet",
      mine: "true",
      maxResults: String(MAX_RESULTS_PER_PAGE),
    });
    if (pageToken) {
      params.set("pageToken", pageToken);
    }

    const res = await fetchImpl(`${SUBSCRIPTIONS_URL}?${params.toString()}`, {
      headers: { authorization: `Bearer ${accessToken}` },
    });
    if (!res.ok) {
      throw new Error(`登録チャンネル一覧の取得に失敗しました: HTTP ${res.status}`);
    }
    const data: SubscriptionsListResponse = await res.json();
    for (const item of data.items ?? []) {
      channels.push({
        channelId: item.snippet.resourceId.channelId,
        title: item.snippet.title,
        thumbnailUrl: item.snippet.thumbnails?.default?.url ?? "",
      });
    }
    pageToken = data.nextPageToken;
  } while (pageToken);

  return channels;
}
