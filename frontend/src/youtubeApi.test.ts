import { describe, expect, it, vi } from "vitest";
import { fetchSubscribedChannels } from "./youtubeApi";

function jsonResponse(body: unknown, ok = true) {
  return { ok, status: ok ? 200 : 401, json: async () => body } as Response;
}

describe("fetchSubscribedChannels", () => {
  it("チャンネル一覧を取得する", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(
      jsonResponse({
        items: [
          {
            snippet: {
              resourceId: { channelId: "UC1" },
              title: "チャンネルA",
              thumbnails: { default: { url: "https://example.com/a.jpg" } },
            },
          },
        ],
      }),
    );

    const channels = await fetchSubscribedChannels("token-123", fetchImpl);

    expect(channels).toEqual([{ channelId: "UC1", title: "チャンネルA", thumbnailUrl: "https://example.com/a.jpg" }]);
    const [url, init] = fetchImpl.mock.calls[0];
    expect(url).toContain("mine=true");
    expect(init.headers.authorization).toBe("Bearer token-123");
  });

  it("nextPageTokenがある間はページネーションする", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        jsonResponse({
          items: [{ snippet: { resourceId: { channelId: "UC1" }, title: "A" } }],
          nextPageToken: "page2",
        }),
      )
      .mockResolvedValueOnce(
        jsonResponse({ items: [{ snippet: { resourceId: { channelId: "UC2" }, title: "B" } }] }),
      );

    const channels = await fetchSubscribedChannels("token-123", fetchImpl);

    expect(channels.map((c) => c.channelId)).toEqual(["UC1", "UC2"]);
    expect(fetchImpl).toHaveBeenCalledTimes(2);
    const [secondUrl] = fetchImpl.mock.calls[1];
    expect(secondUrl).toContain("pageToken=page2");
  });

  it("サムネイルが無い場合は空文字にする", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValue(jsonResponse({ items: [{ snippet: { resourceId: { channelId: "UC1" }, title: "A" } }] }));

    const channels = await fetchSubscribedChannels("token-123", fetchImpl);

    expect(channels[0].thumbnailUrl).toBe("");
  });

  it("HTTPエラーの場合は例外を投げる", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse({}, false));

    await expect(fetchSubscribedChannels("token-123", fetchImpl)).rejects.toThrow("HTTP 401");
  });
});
