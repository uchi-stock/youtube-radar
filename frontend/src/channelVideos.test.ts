import { describe, expect, it, vi } from "vitest";
import { fetchChannelVideos } from "./channelVideos";

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 401, json: async () => body } as Response;
}

describe("fetchChannelVideos", () => {
  it("アップロード済みプレイリストから最新動画一覧を再生回数付きで取得する", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ items: [{ contentDetails: { relatedPlaylists: { uploads: "UUxxx" } } }] }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              snippet: {
                resourceId: { videoId: "v1" },
                title: "動画1",
                publishedAt: "2026-09-01T00:00:00Z",
                thumbnails: { default: { url: "https://example.com/v1.jpg" } },
              },
            },
            {
              snippet: {
                resourceId: { videoId: "v2" },
                title: "動画2",
                publishedAt: "2026-09-02T00:00:00Z",
                thumbnails: {},
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            { id: "v1", statistics: { viewCount: "1234" } },
            { id: "v2", statistics: {} },
          ],
        }),
      );

    const videos = await fetchChannelVideos("UC1", "token-123", fetchImpl);

    expect(videos).toEqual([
      { videoId: "v1", title: "動画1", thumbnailUrl: "https://example.com/v1.jpg", publishedAt: "2026-09-01T00:00:00Z", viewCount: 1234 },
      { videoId: "v2", title: "動画2", thumbnailUrl: "", publishedAt: "2026-09-02T00:00:00Z", viewCount: 0 },
    ]);
    const [channelsUrl, channelsInit] = fetchImpl.mock.calls[0];
    expect(channelsUrl).toContain("https://www.googleapis.com/youtube/v3/channels");
    expect(channelsInit.headers.authorization).toBe("Bearer token-123");
  });

  it("アップロード済みプレイリストが無い場合は空配列を返す", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse({ items: [] }));

    const videos = await fetchChannelVideos("UC1", "token-123", fetchImpl);

    expect(videos).toEqual([]);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("HTTPエラーの場合は例外を投げる", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse({}, false));

    await expect(fetchChannelVideos("UC1", "token-123", fetchImpl)).rejects.toThrow("HTTP 401");
  });
});
