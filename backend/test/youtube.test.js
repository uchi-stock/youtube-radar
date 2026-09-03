import { describe, expect, it, vi } from "vitest";
import { fetchLatestVideos } from "../src/lib/youtube.js";

describe("fetchLatestVideos", () => {
  it("アップロードプレイリストから動画一覧を取得する", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ items: [{ contentDetails: { relatedPlaylists: { uploads: "PL1" } } }] }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [
            {
              snippet: {
                resourceId: { videoId: "v1" },
                title: "動画1",
                publishedAt: "2026-09-01T00:00:00Z",
              },
            },
          ],
        }),
      });

    const videos = await fetchLatestVideos("UC1", "key", { fetchImpl });

    expect(videos).toEqual([{ videoId: "v1", title: "動画1", publishedAt: "2026-09-01T00:00:00Z" }]);
  });

  it("チャンネルが見つからない場合はエラーを投げる", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ items: [] }) });

    await expect(fetchLatestVideos("UC1", "key", { fetchImpl })).rejects.toThrow("channel not found");
  });
});
