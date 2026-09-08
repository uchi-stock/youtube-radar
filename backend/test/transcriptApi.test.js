import { describe, expect, it, vi } from "vitest";
import { getPendingVideos, getVideoDetail, getVideosByIds, submitTranscriptResult } from "../src/transcriptApi.js";
import { VIDEO_STATUS } from "../src/lib/dynamoStore.js";

function jsonResponse(body, ok = true) {
  return { ok, status: ok ? 200 : 500, json: async () => body, text: async () => "" };
}

const env = {
  GEMINI_API_KEY: "llm-key",
  LINE_CHANNEL_ACCESS_TOKEN: "line-token",
  LINE_USER_ID: "line-user",
};

function fakeStore({ pending = [], items = {} } = {}) {
  return {
    loadByStatus: vi.fn(async (status) => {
      if (status === VIDEO_STATUS.PENDING) return pending;
      return [];
    }),
    getStatus: vi.fn(async (videoId) => items[videoId]),
    setStatus: vi.fn(async () => {}),
  };
}

const video = { videoId: "v1", channelName: "テストチャンネル", title: "テスト動画", publishedAt: "2026-09-01" };

describe("getPendingVideos", () => {
  it("PENDINGの動画をmaxVideosPerRunまで返す", async () => {
    const store = fakeStore({ pending: [video, { ...video, videoId: "v2" }] });

    const videos = await getPendingVideos({ store, maxVideosPerRun: 1 });

    expect(videos).toEqual([video]);
  });
});

describe("getVideoDetail", () => {
  it("登録済みの動画の処理状態・要約・タグを返す", async () => {
    const summary = { summary: ["a", "b", "c"], importance: 3, recommendation: 3 };
    const store = fakeStore({
      items: { v1: { ...video, status: VIDEO_STATUS.COMPLETED, summary, tags: ["ゲーム実況"] } },
    });

    const detail = await getVideoDetail({ store, videoId: "v1" });

    expect(detail).toEqual({
      videoId: "v1",
      status: VIDEO_STATUS.COMPLETED,
      channelName: video.channelName,
      title: video.title,
      publishedAt: video.publishedAt,
      summary,
      tags: ["ゲーム実況"],
    });
  });

  it("要約がまだ無い場合はsummaryにnullを返す", async () => {
    const store = fakeStore({ items: { v1: { ...video, status: VIDEO_STATUS.PENDING } } });

    const detail = await getVideoDetail({ store, videoId: "v1" });

    expect(detail?.summary).toBeNull();
  });

  it("tagsが無い場合は空配列を返す", async () => {
    const store = fakeStore({ items: { v1: { ...video, status: VIDEO_STATUS.PENDING } } });

    const detail = await getVideoDetail({ store, videoId: "v1" });

    expect(detail?.tags).toEqual([]);
  });

  it("未登録のvideoIdの場合はnullを返す", async () => {
    const store = fakeStore();

    const detail = await getVideoDetail({ store, videoId: "unknown" });

    expect(detail).toBeNull();
  });
});

describe("getVideosByIds", () => {
  it("複数動画の処理状態・タグをまとめて返す", async () => {
    const store = fakeStore({
      items: {
        v1: { ...video, status: VIDEO_STATUS.COMPLETED, tags: ["ゲーム実況"] },
        v2: { ...video, videoId: "v2", status: VIDEO_STATUS.PENDING },
      },
    });

    const details = await getVideosByIds({ store, videoIds: ["v1", "v2", "unknown"] });

    expect(details).toHaveLength(2);
    expect(details.map((d) => d.videoId)).toEqual(["v1", "v2"]);
    expect(details[0].tags).toEqual(["ゲーム実況"]);
  });

  it("該当する動画が無い場合は空配列を返す", async () => {
    const store = fakeStore();

    const details = await getVideosByIds({ store, videoIds: ["unknown"] });

    expect(details).toEqual([]);
  });
});

describe("submitTranscriptResult", () => {
  it("字幕を受け取ったら要約・LINE通知・COMPLETED更新まで行う（タグも保存する）", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      summary: ["a", "b", "c"],
                      importance: 3,
                      recommendation: 3,
                      tags: ["ゲーム実況"],
                    }),
                  },
                ],
              },
            },
          ],
        }),
      )
      .mockResolvedValueOnce(jsonResponse({}));
    const store = fakeStore({ items: { v1: { ...video, description: "概要欄" } } });

    const result = await submitTranscriptResult({
      store,
      env,
      deps: { fetchImpl },
      videoId: "v1",
      transcript: "本文",
    });

    expect(result).toEqual({ videoId: "v1", status: "reported", lineNotified: true });
    expect(store.setStatus).toHaveBeenCalledWith(
      "v1",
      VIDEO_STATUS.COMPLETED,
      expect.objectContaining({ summary: expect.any(Object), tags: ["ゲーム実況"] }),
    );
    const [, options] = fetchImpl.mock.calls[0];
    expect(JSON.parse(options.body).contents[0].parts[0].text).toContain("概要欄");
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
