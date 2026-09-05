import { describe, expect, it, vi } from "vitest";
import { fetchGoogleUserInfo } from "./googleUserInfo";

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 401, json: async () => body } as Response;
}

describe("fetchGoogleUserInfo", () => {
  it("name・pictureを取得する", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({ name: "テストユーザー", picture: "https://example.com/icon.jpg" }),
    );

    const info = await fetchGoogleUserInfo("token-123", fetchImpl);

    expect(info).toEqual({ name: "テストユーザー", picture: "https://example.com/icon.jpg" });
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://www.googleapis.com/oauth2/v3/userinfo");
    expect(init.headers.authorization).toBe("Bearer token-123");
  });

  it("name・pictureが無い場合は空文字にする", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}));

    const info = await fetchGoogleUserInfo("token-123", fetchImpl);

    expect(info).toEqual({ name: "", picture: "" });
  });

  it("HTTPエラーの場合は例外を投げる", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, false));

    await expect(fetchGoogleUserInfo("token-123", fetchImpl)).rejects.toThrow("HTTP 401");
  });
});
