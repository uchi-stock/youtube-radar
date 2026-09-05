import { describe, expect, it, vi } from "vitest";
import { runTranscriptWorker } from "../src/transcriptWorker.js";
import { VIDEO_STATUS } from "../src/lib/dynamoStore.js";

function jsonResponse(body, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body, text: async () => "" };
}

const env = {
  GEMINI_API_KEY: "llm-key",
  LINE_CHANNEL_ACCESS_TOKEN: "line-token",
  LINE_USER_ID: "line-user",
};

function fakeStore({ pending = [], retryWait = [] } = {}) {
  return {
    loadByStatus: vi.fn(async (status) => {
      if (status === VIDEO_STATUS.PENDING) return pending;
      if (status === VIDEO_STATUS.RETRY_WAIT) return retryWait;
      return [];
    }),
    setStatus: vi.fn(async () => {}),
  };
}

const video = { videoId: "v1", channelName: "テストチャンネル", title: "テスト動画", publishedAt: "2026-09-01" };

describe("runTranscriptWorker", () => {
  it("PENDING動画を字幕取得・要約・LINE通知まで実行しCOMPLETEDにする", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: async () => '<transcript_list><track lang_code="ja"/></transcript_list>',
      })
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: async () => '<text start="0">本文</text>',
      })
      .mockResolvedValueOnce(
        jsonResponse({
          candidates: [
            { content: { parts: [{ text: JSON.stringify({ summary: ["a", "b", "c"], importance: 3, recommendation: 3 }) }] } },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({}));

    const store = fakeStore({ pending: [video] });
    const results = await runTranscriptWorker({
      store,
      env,
      deps: { fetchImpl },
      logger: { error: vi.fn(), warn: vi.fn() },
    });

    expect(results).toEqual([{ videoId: "v1", status: "reported", lineNotified: true }]);
    expect(store.setStatus).toHaveBeenCalledWith(
      "v1",
      VIDEO_STATUS.COMPLETED,
      expect.objectContaining({ channelName: "テストチャンネル" }),
    );
  });

  it("429（アクセス制限）の場合はRETRY_WAITとして次回に持ち越す", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: false,
      status: 429,
      headers: { get: () => null },
      text: async () => "",
    });
    const store = fakeStore({ retryWait: [video] });

    const results = await runTranscriptWorker({
      store,
      env,
      deps: { fetchImpl, retry: { maxRetries: 0 } },
      logger: { error: vi.fn(), warn: vi.fn() },
    });

    expect(results).toEqual([{ videoId: "v1", status: "retry_wait" }]);
    expect(store.setStatus).toHaveBeenCalledWith("v1", VIDEO_STATUS.RETRY_WAIT, expect.any(Object));
  });

  it("字幕が存在しない場合はTRANSCRIPT_NOT_FOUNDにする", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      headers: { get: () => null },
      text: async () => "<transcript_list></transcript_list>",
    });
    const store = fakeStore({ pending: [video] });

    const results = await runTranscriptWorker({
      store,
      env,
      deps: { fetchImpl },
      logger: { error: vi.fn(), warn: vi.fn() },
    });

    expect(results).toEqual([{ videoId: "v1", status: "not_found" }]);
    expect(store.setStatus).toHaveBeenCalledWith("v1", VIDEO_STATUS.TRANSCRIPT_NOT_FOUND, expect.any(Object));
  });

  it("maxVideosPerRunを超える候補は今回処理しない", async () => {
    const video2 = { ...video, videoId: "v2" };
    const fetchImpl = vi.fn();
    const store = fakeStore({ pending: [video, video2] });

    const results = await runTranscriptWorker({
      store,
      env,
      deps: { fetchImpl },
      logger: { error: vi.fn(), warn: vi.fn() },
      maxVideosPerRun: 0,
    });

    expect(results).toEqual([]);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("処理中に例外が発生した場合はFAILEDとして記録し他の候補の処理を継続する", async () => {
    const video2 = { ...video, videoId: "v2" };
    const fetchImpl = vi
      .fn()
      .mockRejectedValueOnce(new Error("network error"))
      .mockResolvedValueOnce({
        ok: true,
        status: 200,
        headers: { get: () => null },
        text: async () => "<transcript_list></transcript_list>",
      });
    const store = fakeStore({ pending: [video, video2] });

    const results = await runTranscriptWorker({
      store,
      env,
      deps: { fetchImpl },
      logger: { error: vi.fn(), warn: vi.fn() },
    });

    expect(results).toEqual([
      { videoId: "v1", status: "failed", error: "network error" },
      { videoId: "v2", status: "not_found" },
    ]);
    expect(store.setStatus).toHaveBeenCalledWith("v1", VIDEO_STATUS.FAILED, expect.any(Object));
  });
});
