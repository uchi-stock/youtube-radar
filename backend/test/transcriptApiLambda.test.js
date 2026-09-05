import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../src/lib/dynamoStore.js", async () => {
  const actual = await vi.importActual("../src/lib/dynamoStore.js");
  return { ...actual, createStore: vi.fn() };
});
vi.mock("../src/transcriptApi.js", () => ({
  getPendingVideos: vi.fn(async () => [{ videoId: "v1" }]),
  submitTranscriptResult: vi.fn(async ({ videoId }) => ({ videoId, status: "reported", lineNotified: true })),
  getVideoDetail: vi.fn(async ({ videoId }) =>
    videoId === "v1" ? { videoId: "v1", status: "COMPLETED", summary: { summary: ["a"] } } : null,
  ),
}));

const { createStore } = await import("../src/lib/dynamoStore.js");
const { getPendingVideos, submitTranscriptResult, getVideoDetail } = await import("../src/transcriptApi.js");
const { handler } = await import("../src/transcriptApiLambda.js");

describe("transcriptApiLambda", () => {
  const originalEnv = process.env;

  beforeEach(() => {
    process.env = { ...originalEnv, PI_API_KEY: "secret", PROCESSED_VIDEOS_TABLE: "table" };
    createStore.mockReturnValue({});
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.clearAllMocks();
  });

  it("x-api-keyが無い、または一致しない場合は401を返す", async () => {
    const res1 = await handler({ headers: {}, requestContext: { http: { method: "GET" } }, rawPath: "/pending" });
    expect(res1.statusCode).toBe(401);

    const res2 = await handler({
      headers: { "x-api-key": "wrong" },
      requestContext: { http: { method: "GET" } },
      rawPath: "/pending",
    });
    expect(res2.statusCode).toBe(401);
  });

  it("GET /pendingは未処理動画一覧を返す", async () => {
    const res = await handler({
      headers: { "x-api-key": "secret" },
      requestContext: { http: { method: "GET" } },
      rawPath: "/pending",
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ videos: [{ videoId: "v1" }] });
    expect(getPendingVideos).toHaveBeenCalled();
  });

  it("POST /transcriptsはボディを渡してsubmitTranscriptResultを呼ぶ", async () => {
    const res = await handler({
      headers: { "x-api-key": "secret" },
      requestContext: { http: { method: "POST" } },
      rawPath: "/transcripts",
      body: JSON.stringify({ videoId: "v1", transcript: "本文" }),
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ videoId: "v1", status: "reported", lineNotified: true });
    expect(submitTranscriptResult).toHaveBeenCalledWith(
      expect.objectContaining({ videoId: "v1", transcript: "本文" }),
    );
  });

  it("不正なJSONボディの場合は400を返す", async () => {
    const res = await handler({
      headers: { "x-api-key": "secret" },
      requestContext: { http: { method: "POST" } },
      rawPath: "/transcripts",
      body: "not json",
    });

    expect(res.statusCode).toBe(400);
  });

  it("未定義のパスは404を返す", async () => {
    const res = await handler({
      headers: { "x-api-key": "secret" },
      requestContext: { http: { method: "GET" } },
      rawPath: "/unknown",
    });

    expect(res.statusCode).toBe(404);
  });

  it("GET /videos/{videoId}はx-api-keyが無くても呼べる（公開エンドポイント）", async () => {
    const res = await handler({
      headers: {},
      requestContext: { http: { method: "GET" } },
      rawPath: "/videos/v1",
      pathParameters: { videoId: "v1" },
    });

    expect(res.statusCode).toBe(200);
    expect(JSON.parse(res.body)).toEqual({ videoId: "v1", status: "COMPLETED", summary: { summary: ["a"] } });
    expect(getVideoDetail).toHaveBeenCalledWith(expect.objectContaining({ videoId: "v1" }));
  });

  it("GET /videos/{videoId}で未登録の場合は404を返す", async () => {
    const res = await handler({
      headers: {},
      requestContext: { http: { method: "GET" } },
      rawPath: "/videos/unknown",
      pathParameters: { videoId: "unknown" },
    });

    expect(res.statusCode).toBe(404);
  });
});
