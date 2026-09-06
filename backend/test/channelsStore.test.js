import { describe, expect, it, vi } from "vitest";
import { createChannelsStore } from "../src/lib/channelsStore.js";

describe("channelsStore", () => {
  it("ページネーションしながらチャンネル一覧を読み込む", async () => {
    const client = {
      send: vi
        .fn()
        .mockResolvedValueOnce({ Items: [{ channelId: "c1", name: "チャンネルA" }], LastEvaluatedKey: { channelId: "c1" } })
        .mockResolvedValueOnce({ Items: [{ channelId: "c2", name: "チャンネルB" }] }),
    };
    const store = createChannelsStore("table", { client });

    const channels = await store.loadChannels();

    expect(channels.map((c) => c.channelId)).toEqual(["c1", "c2"]);
    expect(client.send).toHaveBeenCalledTimes(2);
  });

  it("saveChannelsで渡された一覧を書き込む", async () => {
    const client = {
      send: vi.fn().mockResolvedValueOnce({ Items: [] }).mockResolvedValue({}),
    };
    const store = createChannelsStore("table", { client });

    await store.saveChannels([
      { channelId: "c1", name: "チャンネルA" },
      { channelId: "c2", name: "チャンネルB" },
    ]);

    const putCalls = client.send.mock.calls.slice(1);
    expect(putCalls).toHaveLength(2);
    expect(putCalls[0][0].input.Item).toMatchObject({ channelId: "c1", name: "チャンネルA" });
    expect(putCalls[1][0].input.Item).toMatchObject({ channelId: "c2", name: "チャンネルB" });
  });

  it("saveChannelsで一覧に無くなったチャンネルを削除する", async () => {
    const client = {
      send: vi
        .fn()
        .mockResolvedValueOnce({
          Items: [
            { channelId: "c1", name: "チャンネルA" },
            { channelId: "c2", name: "チャンネルB" },
          ],
        })
        .mockResolvedValue({}),
    };
    const store = createChannelsStore("table", { client });

    await store.saveChannels([{ channelId: "c1", name: "チャンネルA" }]);

    const lastCall = client.send.mock.calls.at(-1)[0];
    expect(lastCall.input.TableName).toBe("table");
    expect(lastCall.input.Key).toEqual({ channelId: "c2" });
  });
});
