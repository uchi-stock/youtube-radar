import { describe, expect, it, vi } from "vitest";
import { getAccessToken } from "../src/lib/googleAuth.js";

describe("getAccessToken", () => {
  it("リフレッシュトークンからアクセストークンを取得する", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ access_token: "access-token-value" }),
    });

    const token = await getAccessToken({
      clientId: "client-id",
      clientSecret: "client-secret",
      refreshToken: "refresh-token",
      fetchImpl,
    });

    expect(token).toBe("access-token-value");
    const [url, options] = fetchImpl.mock.calls[0];
    expect(url).toBe("https://oauth2.googleapis.com/token");
    expect(options.body.toString()).toContain("grant_type=refresh_token");
  });

  it("失敗時は例外を投げる", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 401 });

    await expect(
      getAccessToken({ clientId: "c", clientSecret: "s", refreshToken: "r", fetchImpl }),
    ).rejects.toThrow("Google OAuthのアクセストークン取得に失敗しました: 401");
  });
});
