import { describe, expect, it, vi } from "vitest";
import { fetchVideoTags } from "./videoTags";

function jsonResponse(body: unknown, status = 200) {
  return { ok: status < 400, status, json: async () => body } as Response;
}

describe("fetchVideoTags", () => {
  it("videoIdをカンマ区切りで渡し、videoIdごとのタグのマップを返す", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        videos: [
          { videoId: "v1", tags: ["ゲーム実況", "雑談"] },
          { videoId: "v2", tags: [] },
        ],
      }),
    );

    const result = await fetchVideoTags(["v1", "v2"], "https://api.example.com", fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith("https://api.example.com/videos?ids=v1%2Cv2");
    expect(result.get("v1")).toEqual(["ゲーム実況", "雑談"]);
    expect(result.get("v2")).toEqual([]);
  });

  it("tagsが無い動画は空配列にする", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ videos: [{ videoId: "v1" }] }));

    const result = await fetchVideoTags(["v1"], "https://api.example.com", fetchImpl);

    expect(result.get("v1")).toEqual([]);
  });

  it("末尾スラッシュ付きのベースURLでも二重スラッシュにならない", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({ videos: [] }));

    await fetchVideoTags(["v1"], "https://api.example.com/", fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith("https://api.example.com/videos?ids=v1");
  });

  it("videoIdsが空の場合はfetchを呼ばずに空のマップを返す", async () => {
    const fetchImpl = vi.fn();

    const result = await fetchVideoTags([], "https://api.example.com", fetchImpl);

    expect(fetchImpl).not.toHaveBeenCalled();
    expect(result.size).toBe(0);
  });

  it("HTTPエラーの場合は例外を投げる", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, 500));

    await expect(fetchVideoTags(["v1"], "https://api.example.com", fetchImpl)).rejects.toThrow("HTTP 500");
  });
});
