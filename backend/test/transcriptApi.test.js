import { describe, expect, it, vi } from "vitest";
import { getPendingVideos, submitTranscriptResult } from "../src/transcriptApi.js";
import { VIDEO_STATUS } from "../src/lib/dynamoStore.js";

function jsonResponse(body, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body, text: async () => "" };
}

const env = {
  GEMINI_API_KEY: "llm-key",
  LINE_CHANNEL_ACCESS_TOKEN: "line-token",
  LINE_USER_ID: "line-user",
};

function fakeStore({ pending = [], retryWait = [], items = {} } = {}) {
  return {
    loadByStatus: vi.fn(async (status) => {
      if (status === VIDEO_STATUS.PENDING) return pending;
      if (status === VIDEO_STATUS.RETRY_WAIT) return retryWait;
      return [];
    }),
    getStatus: vi.fn(async (videoId) => items[videoId]),
    setStatus: vi.fn(async () => {}),
  };
}

const video = { videoId: "v1", channelName: "テストチャンネル", title: "テスト動画", publishedAt: "2026-09-01" };

describe("getPendingVideos", () => {
  it("PENDINGとRETRY_WAITの動画をmaxVideosPerRunまで返す", async () => {
    const store = fakeStore({ pending: [video], retryWait: [{ ...video, videoId: "v2" }] });

    const videos = await getPendingVideos({ store, maxVideosPerRun: 1 });

    expect(videos).toEqual([video]);
  });
});

describe("submitTranscriptResult", () => {
  it("字幕を受け取ったら要約・LINE通知・COMPLETED更新まで行う", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          candidates: [
            { content: { parts: [{ text: JSON.stringify({ summary: ["a", "b", "c"], importance: 3, recommendation: 3 }) }] } },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({}));
    const store = fakeStore({ items: { v1: video } });

    const result = await submitTranscriptResult({
      store,
      env,
      deps: { fetchImpl },
      videoId: "v1",
      transcript: "本文",
    });

    expect(result).toEqual({ videoId: "v1", status: "reported", lineNotified: true });
    expect(store.setStatus).toHaveBeenCalledWith("v1", VIDEO_STATUS.COMPLETED, expect.any(Object));
  });

  it("status: NOT_FOUNDが指定された場合はTRANSCRIPT_NOT_FOUNDにする", async () => {
    const store = fakeStore({ items: { v1: video } });

    const result = await submitTranscriptResult({ store, env, videoId: "v1", status: "NOT_FOUND" });

    expect(result).toEqual({ videoId: "v1", status: "not_found" });
    expect(store.setStatus).toHaveBeenCalledWith("v1", VIDEO_STATUS.TRANSCRIPT_NOT_FOUND, expect.any(Object));
  });

  it("未登録のvideoIdの場合はnot_registeredを返す", async () => {
    const store = fakeStore();

    const result = await submitTranscriptResult({ store, env, videoId: "unknown", transcript: "本文" });

    expect(result).toEqual({ videoId: "unknown", status: "not_registered" });
    expect(store.setStatus).not.toHaveBeenCalled();
  });

  it("videoIdが無ければ例外を投げる", async () => {
    const store = fakeStore();

    await expect(submitTranscriptResult({ store, env, videoId: undefined })).rejects.toThrow("videoId is required");
  });

  it("要約・通知処理中に例外が発生した場合はFAILEDとして記録する", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, false));
    const store = fakeStore({ items: { v1: video } });

    const result = await submitTranscriptResult({
      store,
      env,
      deps: { fetchImpl },
      videoId: "v1",
      transcript: "本文",
    });

    expect(result.status).toBe("failed");
    expect(store.setStatus).toHaveBeenCalledWith("v1", VIDEO_STATUS.FAILED, expect.any(Object));
  });
});
