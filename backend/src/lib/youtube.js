const API_BASE = "https://www.googleapis.com/youtube/v3";

async function getUploadsPlaylistId(channelId, apiKey, fetchImpl = fetch) {
  const url = `${API_BASE}/channels?part=contentDetails&id=${encodeURIComponent(channelId)}&key=${encodeURIComponent(apiKey)}`;
  const res = await fetchImpl(url);
  if (!res.ok) {
    throw new Error(`YouTube channels.list failed: ${res.status}`);
  }
  const data = await res.json();
  const item = data.items?.[0];
  if (!item) {
    throw new Error(`channel not found: ${channelId}`);
  }
  return item.contentDetails.relatedPlaylists.uploads;
}

export async function fetchLatestVideos(channelId, apiKey, { maxResults = 5, fetchImpl = fetch } = {}) {
  const uploadsPlaylistId = await getUploadsPlaylistId(channelId, apiKey, fetchImpl);
  const url = `${API_BASE}/playlistItems?part=snippet&playlistId=${encodeURIComponent(uploadsPlaylistId)}&maxResults=${maxResults}&key=${encodeURIComponent(apiKey)}`;
  const res = await fetchImpl(url);
  if (!res.ok) {
    throw new Error(`YouTube playlistItems.list failed: ${res.status}`);
  }
  const data = await res.json();
  return (data.items ?? []).map((item) => ({
    videoId: item.snippet.resourceId.videoId,
    title: item.snippet.title,
    publishedAt: item.snippet.publishedAt,
  }));
}
