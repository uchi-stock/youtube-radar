import { describe, expect, it, vi } from "vitest";
import { verifyGoogleAccessToken } from "../src/lib/verifyGoogleAccessToken.js";

function jsonResponse(body, ok = true) {
  return { ok, json: async () => body };
}

describe("verifyGoogleAccessToken", () => {
  it("audが一致しuserinfoが取得できればメールアドレスを返す", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ aud: "client-id" }))
      .mockResolvedValueOnce(jsonResponse({ email: "owner@example.com" }));

    const result = await verifyGoogleAccessToken("token", { clientId: "client-id", fetchImpl });

    expect(result).toEqual({ email: "owner@example.com" });
  });

  it("tokeninfoの取得に失敗した場合はnullを返す", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse({}, false));

    const result = await verifyGoogleAccessToken("token", { clientId: "client-id", fetchImpl });

    expect(result).toBeNull();
  });

  it("audが一致しない場合はnullを返す", async () => {
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse({ aud: "other-client-id" }));

    const result = await verifyGoogleAccessToken("token", { clientId: "client-id", fetchImpl });

    expect(result).toBeNull();
  });

  it("userinfoの取得に失敗した場合はnullを返す", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ aud: "client-id" }))
      .mockResolvedValueOnce(jsonResponse({}, false));

    const result = await verifyGoogleAccessToken("token", { clientId: "client-id", fetchImpl });

    expect(result).toBeNull();
  });

  it("userinfoにemailが含まれない場合はnullを返す", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ aud: "client-id" }))
      .mockResolvedValueOnce(jsonResponse({}));

    const result = await verifyGoogleAccessToken("token", { clientId: "client-id", fetchImpl });

    expect(result).toBeNull();
  });
});
