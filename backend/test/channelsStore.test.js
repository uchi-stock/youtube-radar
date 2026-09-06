import { describe, expect, it, vi } from "vitest";
import { createChannelsStore } from "../src/lib/channelsStore.js";

describe("channelsStore", () => {
  it("ページネーションしながら全ユーザー分のチャンネル一覧を読み込み、channelIdで重複排除する", async () => {
    const client = {
      send: vi
        .fn()
        .mockResolvedValueOnce({
          Items: [{ userEmail: "a@example.com", channelId: "c1", name: "チャンネルA" }],
          LastEvaluatedKey: { userEmail: "a@example.com", channelId: "c1" },
        })
        .mockResolvedValueOnce({
          Items: [
            { userEmail: "a@example.com", channelId: "c2", name: "チャンネルB" },
            { userEmail: "b@example.com", channelId: "c1", name: "チャンネルA（重複）" },
          ],
        }),
    };
    const store = createChannelsStore("table", { client });

    const channels = await store.loadAllChannels();

    expect(channels.map((c) => c.channelId).sort()).toEqual(["c1", "c2"]);
    expect(client.send).toHaveBeenCalledTimes(2);
  });

  it("saveChannelsでuserEmailを付与して書き込む", async () => {
    const client = {
      send: vi.fn().mockResolvedValueOnce({ Items: [] }).mockResolvedValue({}),
    };
    const store = createChannelsStore("table", { client });

    await store.saveChannels("owner@example.com", [
      { channelId: "c1", name: "チャンネルA" },
      { channelId: "c2", name: "チャンネルB" },
    ]);

    const putCalls = client.send.mock.calls.slice(1);
    expect(putCalls).toHaveLength(2);
    expect(putCalls[0][0].input.Item).toMatchObject({ userEmail: "owner@example.com", channelId: "c1" });
    expect(putCalls[1][0].input.Item).toMatchObject({ userEmail: "owner@example.com", channelId: "c2" });
  });

  it("saveChannelsで一覧に無くなった、そのユーザーのチャンネルのみ削除する", async () => {
    const client = {
      send: vi
        .fn()
        .mockResolvedValueOnce({
          Items: [
            { userEmail: "owner@example.com", channelId: "c1", name: "チャンネルA" },
            { userEmail: "owner@example.com", channelId: "c2", name: "チャンネルB" },
          ],
        })
        .mockResolvedValue({}),
    };
    const store = createChannelsStore("table", { client });

    await store.saveChannels("owner@example.com", [{ channelId: "c1", name: "チャンネルA" }]);

    const queryCall = client.send.mock.calls[0][0];
    expect(queryCall.input.ExpressionAttributeValues).toEqual({ ":userEmail": "owner@example.com" });

    const lastCall = client.send.mock.calls.at(-1)[0];
    expect(lastCall.input.TableName).toBe("table");
    expect(lastCall.input.Key).toEqual({ userEmail: "owner@example.com", channelId: "c2" });
  });
});
