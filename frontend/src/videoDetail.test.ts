import { describe, expect, it, vi } from "vitest";
import { fetchVideoDetail } from "./videoDetail";

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body } as Response;
}

describe("fetchVideoDetail", () => {
  it("処理済みの動画は状態・要約を返す", async () => {
    const detail = {
      videoId: "v1",
      status: "COMPLETED",
      summary: { summary: ["a", "b", "c"], importance: 3, recommendation: 4 },
    };
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(detail));

    const result = await fetchVideoDetail("v1", "https://api.example.com", fetchImpl);

    expect(result).toEqual(detail);
    expect(fetchImpl).toHaveBeenCalledWith("https://api.example.com/videos/v1");
  });

  it("末尾スラッシュ付きのベースURLでも二重スラッシュにならない", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ videoId: "v1", status: "PENDING", summary: null }));

    await fetchVideoDetail("v1", "https://api.example.com/", fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith("https://api.example.com/videos/v1");
  });

  it("未登録（404）の場合はnullを返す", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ error: "not_registered" }, 404));

    const result = await fetchVideoDetail("unknown", "https://api.example.com", fetchImpl);

    expect(result).toBeNull();
  });

  it("その他のHTTPエラーの場合は例外を投げる", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, 500));

    await expect(fetchVideoDetail("v1", "https://api.example.com", fetchImpl)).rejects.toThrow("HTTP 500");
  });
});
