import { describe, expect, it, vi } from "vitest";
import { runDiscovery } from "../src/discovery.js";
import { VIDEO_STATUS } from "../src/lib/dynamoStore.js";

function jsonResponse(body, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body, text: async () => "" };
}

const channels = [{ channelId: "UC1", name: "テストチャンネル", enabled: true }];
const env = { YOUTUBE_API_KEY: "yt-key" };

function fakeStore(existing = {}) {
  return {
    getStatus: vi.fn(async (videoId) => existing[videoId]),
    setStatus: vi.fn(async () => {}),
  };
}

describe("runDiscovery", () => {
  it("新着動画をPENDINGとしてDynamoDBへ登録する（Transcript取得は一切呼び出さない）", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ items: [{ contentDetails: { relatedPlaylists: { uploads: "PL1" } } }] }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              snippet: {
                resourceId: { videoId: "v1" },
                title: "テスト動画",
                publishedAt: "2026-09-01T00:00:00Z",
              },
            },
          ],
        }),
      );
    const store = fakeStore();

    const results = await runDiscovery({
      channels,
      store,
      env,
      deps: { fetchImpl },
      logger: { error: vi.fn(), warn: vi.fn() },
    });

    expect(results).toEqual([{ videoId: "v1", status: "pending" }]);
    expect(store.setStatus).toHaveBeenCalledWith(
      "v1",
      VIDEO_STATUS.PENDING,
      expect.objectContaining({ channelName: "テストチャンネル", title: "テスト動画" }),
    );
    // 新着検知はYouTube Data APIの2回のみ呼び出し、timedtext等は呼ばない
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("既に何らかの状態で登録済みの動画は再登録しない", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ items: [{ contentDetails: { relatedPlaylists: { uploads: "PL1" } } }] }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [{ snippet: { resourceId: { videoId: "v1" }, title: "t", publishedAt: "2026-09-01" } }],
        }),
      );
    const store = fakeStore({ v1: { videoId: "v1", status: VIDEO_STATUS.COMPLETED } });

    const results = await runDiscovery({
      channels,
      store,
      env,
      deps: { fetchImpl },
      logger: { error: vi.fn(), warn: vi.fn() },
    });

    expect(results).toEqual([]);
    expect(store.setStatus).not.toHaveBeenCalled();
  });

  it("チャンネルの新着動画取得に失敗しても他チャンネルの処理を継続する", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, false));
    const store = fakeStore();
    const logger = { error: vi.fn(), warn: vi.fn() };

    const results = await runDiscovery({ channels, store, env, deps: { fetchImpl }, logger });

    expect(results).toEqual([]);
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining("新着動画の取得に失敗しました"));
  });
});
