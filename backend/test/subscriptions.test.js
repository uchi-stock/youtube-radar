import { describe, expect, it, vi } from "vitest";
import { fetchSubscribedChannels } from "../src/lib/subscriptions.js";

describe("fetchSubscribedChannels", () => {
  it("ページネーションしながらチャンネル登録一覧を取得する", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ snippet: { resourceId: { channelId: "UC1" }, title: "チャンネル1" } }],
          nextPageToken: "page2",
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          items: [{ snippet: { resourceId: { channelId: "UC2" }, title: "チャンネル2" } }],
        }),
      });

    const channels = await fetchSubscribedChannels("access-token", { fetchImpl });

    expect(channels).toEqual([
      { channelId: "UC1", name: "チャンネル1", enabled: true },
      { channelId: "UC2", name: "チャンネル2", enabled: true },
    ]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const [firstUrl, firstOptions] = fetchImpl.mock.calls[0];
    expect(firstUrl).toContain("mine=true");
    expect(firstOptions.headers.authorization).toBe("Bearer access-token");
    const [secondUrl] = fetchImpl.mock.calls[1];
    expect(secondUrl).toContain("pageToken=page2");
  });

  it("APIエラー時は例外を投げる", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 403 });

    await expect(fetchSubscribedChannels("token", { fetchImpl })).rejects.toThrow(
      "YouTube subscriptions.list failed: 403",
    );
  });
});
