import { describe, expect, it, vi } from "vitest";
import { submitChannels } from "../src/channelsApi.js";

function jsonResponse(body, ok = true) {
  return { ok, json: async () => body };
}

const CHANNELS = [{ channelId: "c1", name: "チャンネルA" }];

describe("submitChannels", () => {
  it("正しいアクセストークンなら、そのユーザー自身の行としてチャンネル一覧を保存する", async () => {
    const store = { saveChannels: vi.fn() };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ aud: "client-id" }))
      .mockResolvedValueOnce(jsonResponse({ email: "user@example.com" }));

    const result = await submitChannels({
      store,
      accessToken: "token",
      channels: CHANNELS,
      clientId: "client-id",
      deps: { fetchImpl },
    });

    expect(result).toEqual({ status: "saved", count: 1 });
    expect(store.saveChannels).toHaveBeenCalledWith("user@example.com", CHANNELS);
  });

  it("アクセストークンが無い場合はunauthorizedを返す", async () => {
    const store = { saveChannels: vi.fn() };

    const result = await submitChannels({
      store,
      accessToken: "",
      channels: CHANNELS,
      clientId: "client-id",
    });

    expect(result).toEqual({ status: "unauthorized" });
    expect(store.saveChannels).not.toHaveBeenCalled();
  });

  it("アクセストークンの検証に失敗した場合はunauthorizedを返す", async () => {
    const store = { saveChannels: vi.fn() };
    const fetchImpl = vi.fn().mockResolvedValueOnce(jsonResponse({}, false));

    const result = await submitChannels({
      store,
      accessToken: "token",
      channels: CHANNELS,
      clientId: "client-id",
      deps: { fetchImpl },
    });

    expect(result).toEqual({ status: "unauthorized" });
    expect(store.saveChannels).not.toHaveBeenCalled();
  });

  it("channelsが配列でない場合はinvalid_bodyを返す", async () => {
    const store = { saveChannels: vi.fn() };
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(jsonResponse({ aud: "client-id" }))
      .mockResolvedValueOnce(jsonResponse({ email: "user@example.com" }));

    const result = await submitChannels({
      store,
      accessToken: "token",
      channels: undefined,
      clientId: "client-id",
      deps: { fetchImpl },
    });

    expect(result).toEqual({ status: "invalid_body" });
    expect(store.saveChannels).not.toHaveBeenCalled();
  });
});
