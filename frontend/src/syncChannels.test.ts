import { describe, expect, it, vi } from "vitest";
import { syncChannels } from "./syncChannels";
import type { SubscribedChannel } from "./youtubeApi";

function jsonResponse(status = 200) {
  return { ok: status < 400, status } as Response;
}

const CHANNELS: SubscribedChannel[] = [{ channelId: "c1", title: "チャンネルA", thumbnailUrl: "" }];

describe("syncChannels", () => {
  it("チャンネル一覧をPOST /channelsへ送信する", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse());

    await syncChannels(CHANNELS, "token", "https://api.example.com", fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith(
      "https://api.example.com/channels",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({ authorization: "Bearer token" }),
      }),
    );
    const [, options] = fetchImpl.mock.calls[0];
    expect(JSON.parse(options.body as string)).toEqual({
      channels: [{ channelId: "c1", name: "チャンネルA", enabled: true }],
    });
  });

  it("末尾スラッシュ付きのベースURLでも二重スラッシュにならない", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse());

    await syncChannels(CHANNELS, "token", "https://api.example.com/", fetchImpl);

    expect(fetchImpl).toHaveBeenCalledWith("https://api.example.com/channels", expect.anything());
  });

  it("HTTPエラーの場合は例外を投げる", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(jsonResponse(500));

    await expect(syncChannels(CHANNELS, "token", "https://api.example.com", fetchImpl)).rejects.toThrow("HTTP 500");
  });
});
