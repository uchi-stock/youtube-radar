import { describe, expect, it, vi } from "vitest";
import { createStore } from "../src/lib/dynamoStore.js";

describe("dynamoStore", () => {
  it("ページネーションしながら処理済み動画IDを読み込む", async () => {
    const client = {
      send: vi
        .fn()
        .mockResolvedValueOnce({ Items: [{ videoId: "v1" }], LastEvaluatedKey: { videoId: "v1" } })
        .mockResolvedValueOnce({ Items: [{ videoId: "v2" }] }),
    };
    const store = createStore("table", { client });

    const ids = await store.loadProcessedIds();

    expect([...ids].sort()).toEqual(["v1", "v2"]);
    expect(client.send).toHaveBeenCalledTimes(2);
  });

  it("markProcessedで動画IDをテーブルへ書き込む", async () => {
    const client = { send: vi.fn().mockResolvedValue({}) };
    const store = createStore("table", { client });

    await store.markProcessed("v1");

    expect(client.send).toHaveBeenCalledTimes(1);
    const command = client.send.mock.calls[0][0];
    expect(command.input.TableName).toBe("table");
    expect(command.input.Item.videoId).toBe("v1");
  });
});
