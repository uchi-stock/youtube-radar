const API_BASE = "https://www.googleapis.com/youtube/v3";

// subscriptions.listはユーザー本人のチャンネル登録一覧を返すAPIのため、
// APIキーではなくOAuthアクセストークン（Authorizationヘッダ）での認可が必要
// （https://developers.google.com/youtube/v3/docs/subscriptions/list）。
export async function fetchSubscribedChannels(accessToken, { fetchImpl = fetch } = {}) {
  const channels = [];
  let pageToken = "";
  do {
    const url = `${API_BASE}/subscriptions?part=snippet&mine=true&maxResults=50${pageToken ? `&pageToken=${pageToken}` : ""}`;
    const res = await fetchImpl(url, { headers: { authorization: `Bearer ${accessToken}` } });
    if (!res.ok) {
      throw new Error(`YouTube subscriptions.list failed: ${res.status}`);
    }
    const data = await res.json();
    for (const item of data.items ?? []) {
      channels.push({
        channelId: item.snippet.resourceId.channelId,
        name: item.snippet.title,
        enabled: true,
      });
    }
    pageToken = data.nextPageToken ?? "";
  } while (pageToken);
  return channels;
}
