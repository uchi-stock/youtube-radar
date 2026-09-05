import { describe, expect, it, vi } from "vitest";
import { runPipeline } from "../src/pipeline.js";

function jsonResponse(body, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body, text: async () => "" };
}

const channels = [{ channelId: "UC1", name: "テストチャンネル", enabled: true }];
const env = {
  YOUTUBE_API_KEY: "yt-key",
  GEMINI_API_KEY: "llm-key",
  LINE_CHANNEL_ACCESS_TOKEN: "line-token",
  LINE_USER_ID: "line-user",
};

describe("runPipeline", () => {
  it("新着動画を検知し文字起こし取得・要約・LINE通知まで実行し処理済みとして記録する", async () => {
    const fetchImpl = vi
      .fn()
      // channels.list
      .mockResolvedValueOnce(
        jsonResponse({ items: [{ contentDetails: { relatedPlaylists: { uploads: "PL1" } } }] }),
      )
      // playlistItems.list
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
      )
      // timedtext type=list（字幕トラック一覧）
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '<transcript_list><track lang_code="ja"/></transcript_list>',
      })
      // timedtext（字幕本文）
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '<text start="0">こんにちは</text><text start="1">世界</text>',
      })
      // LLM summarize
      .mockResolvedValueOnce(
        jsonResponse({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({ summary: ["要点1", "要点2", "要点3"], importance: 4, recommendation: 5 }),
                  },
                ],
              },
            },
          ],
        }),
      )
      // LINE push
      .mockResolvedValueOnce(jsonResponse({}));

    const processedIds = new Set();
    const results = await runPipeline({
      channels,
      processedIds,
      markProcessed: vi.fn(),
      env,
      deps: { fetchImpl },
      logger: { error: vi.fn(), warn: vi.fn() },
    });

    expect(results).toEqual([{ videoId: "v1", status: "reported", lineNotified: true }]);
    expect(processedIds.has("v1")).toBe(true);
    expect(fetchImpl).toHaveBeenCalledTimes(6);
  });

  it("LINE未設定でも要約結果を処理済みとして記録し、LINE通知のみスキップする", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ items: [{ contentDetails: { relatedPlaylists: { uploads: "PL1" } } }] }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [
            {
              snippet: { resourceId: { videoId: "v1" }, title: "テスト動画", publishedAt: "2026-09-01T00:00:00Z" },
            },
          ],
        }),
      )
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '<transcript_list><track lang_code="ja"/></transcript_list>',
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '<text start="0">本文</text>',
      })
      .mockResolvedValueOnce(
        jsonResponse({
          candidates: [
            {
              content: {
                parts: [{ text: JSON.stringify({ summary: ["要点1", "要点2", "要点3"], importance: 4, recommendation: 5 }) }],
              },
            },
          ],
        }),
      );

    const processedIds = new Set();
    const warn = vi.fn();
    const results = await runPipeline({
      channels,
      processedIds,
      markProcessed: vi.fn(),
      env: { ...env, LINE_CHANNEL_ACCESS_TOKEN: undefined, LINE_USER_ID: undefined },
      deps: { fetchImpl },
      logger: { error: vi.fn(), warn },
    });

    expect(results).toEqual([{ videoId: "v1", status: "reported", lineNotified: false }]);
    expect(processedIds.has("v1")).toBe(true);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("LINE通知をスキップしました"));
    // LINE pushの呼び出しが発生していないこと（5回目まででfetchが止まっている）
    expect(fetchImpl).toHaveBeenCalledTimes(5);
  });

  it("既に処理済みの動画は再通知しない", async () => {
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

    const processedIds = new Set(["v1"]);
    const results = await runPipeline({
      channels,
      processedIds,
      markProcessed: vi.fn(),
      env,
      deps: { fetchImpl },
      logger: { error: vi.fn(), warn: vi.fn() },
    });

    expect(results).toEqual([]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
  });

  it("文字起こしが取得できない動画は処理済みにせずスキップする", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ items: [{ contentDetails: { relatedPlaylists: { uploads: "PL1" } } }] }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [{ snippet: { resourceId: { videoId: "v1" }, title: "t", publishedAt: "2026-09-01" } }],
        }),
      )
      .mockResolvedValueOnce({ ok: false, status: 404, text: async () => "" });

    const processedIds = new Set();
    const results = await runPipeline({
      channels,
      processedIds,
      markProcessed: vi.fn(),
      env,
      deps: { fetchImpl },
      logger: { error: vi.fn(), warn: vi.fn() },
    });

    expect(results).toEqual([]);
    expect(processedIds.has("v1")).toBe(false);
  });

  it("1動画の処理失敗時も他の動画・チャンネルの処理を継続する", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({ items: [{ contentDetails: { relatedPlaylists: { uploads: "PL1" } } }] }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [{ snippet: { resourceId: { videoId: "v1" }, title: "t", publishedAt: "2026-09-01" } }],
        }),
      )
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '<transcript_list><track lang_code="ja"/></transcript_list>',
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '<text start="0">本文</text>',
      })
      .mockResolvedValueOnce(jsonResponse({}, false));

    const processedIds = new Set();
    const results = await runPipeline({
      channels,
      processedIds,
      markProcessed: vi.fn(),
      env,
      deps: { fetchImpl },
      logger: { error: vi.fn(), warn: vi.fn() },
    });

    expect(results).toEqual([{ videoId: "v1", status: "failed", error: "LLM summarize failed: 500" }]);
    expect(processedIds.has("v1")).toBe(false);
  });

  it("maxVideosPerRunを超える未処理動画は今回処理せず次回に持ち越す", async () => {
    const twoChannels = [
      { channelId: "UC1", name: "チャンネルA", enabled: true },
      { channelId: "UC2", name: "チャンネルB", enabled: true },
    ];
    const fetchImpl = vi
      .fn()
      // チャンネルA: channels.list, playlistItems.list, timedtext(list), timedtext(本文)
      .mockResolvedValueOnce(
        jsonResponse({ items: [{ contentDetails: { relatedPlaylists: { uploads: "PL1" } } }] }),
      )
      .mockResolvedValueOnce(
        jsonResponse({
          items: [{ snippet: { resourceId: { videoId: "v1" }, title: "t1", publishedAt: "2026-09-01" } }],
        }),
      )
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        text: async () => '<transcript_list><track lang_code="ja"/></transcript_list>',
      })
      .mockResolvedValueOnce({ ok: true, status: 200, text: async () => '<text start="0">本文</text>' })
      .mockResolvedValueOnce(
        jsonResponse({
          candidates: [
            { content: { parts: [{ text: JSON.stringify({ summary: ["a", "b", "c"], importance: 3, recommendation: 3 }) }] } },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({}));
    // チャンネルBは上限到達後は新着検知すら行われないため、これ以上のモックは登録しない

    const processedIds = new Set();
    const warn = vi.fn();
    const results = await runPipeline({
      channels: twoChannels,
      processedIds,
      markProcessed: vi.fn(),
      env,
      deps: { fetchImpl },
      logger: { error: vi.fn(), warn },
      maxVideosPerRun: 1,
    });

    expect(results).toEqual([{ videoId: "v1", status: "reported", lineNotified: true }]);
    expect(processedIds.has("v1")).toBe(true);
    // チャンネルBのfetchLatestVideos（channels.list）が呼ばれていないこと
    expect(fetchImpl).toHaveBeenCalledTimes(6);
    expect(warn).toHaveBeenCalledWith(expect.stringContaining("処理件数上限"));
  });
});
