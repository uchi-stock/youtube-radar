import { describe, expect, it, vi } from "vitest";
import { createStore, VIDEO_STATUS } from "../src/lib/dynamoStore.js";

describe("dynamoStore", () => {
  it("ページネーションしながら処理済み動画IDを読み込む（status未設定の既存レコードも処理済み扱い）", async () => {
    const client = {
      send: vi
        .fn()
        .mockResolvedValueOnce({ Items: [{ videoId: "v1" }], LastEvaluatedKey: { videoId: "v1" } })
        .mockResolvedValueOnce({ Items: [{ videoId: "v2", status: VIDEO_STATUS.COMPLETED }] }),
    };
    const store = createStore("table", { client });

    const ids = await store.loadProcessedIds();

    expect([...ids].sort()).toEqual(["v1", "v2"]);
    expect(client.send).toHaveBeenCalledTimes(2);
  });

  it("PROCESSING・PENDING・FAILEDの動画は処理済みとして扱わない（次回も候補になる）", async () => {
    const client = {
      send: vi.fn().mockResolvedValue({
        Items: [
          { videoId: "v1", status: VIDEO_STATUS.PROCESSING },
          { videoId: "v2", status: VIDEO_STATUS.PENDING },
          { videoId: "v3", status: VIDEO_STATUS.FAILED },
          { videoId: "v4", status: VIDEO_STATUS.TRANSCRIPT_NOT_FOUND },
        ],
      }),
    };
    const store = createStore("table", { client });

    const ids = await store.loadProcessedIds();

    expect([...ids]).toEqual(["v4"]);
  });

  it("markProcessedで動画IDをCOMPLETED状態としてテーブルへ書き込む", async () => {
    const client = { send: vi.fn().mockResolvedValue({}) };
    const store = createStore("table", { client });

    await store.markProcessed("v1");

    expect(client.send).toHaveBeenCalledTimes(1);
    const command = client.send.mock.calls[0][0];
    expect(command.input.TableName).toBe("table");
    expect(command.input.Item.videoId).toBe("v1");
    expect(command.input.Item.status).toBe(VIDEO_STATUS.COMPLETED);
  });

  it("setStatusで任意の状態・付加情報を書き込む", async () => {
    const client = { send: vi.fn().mockResolvedValue({}) };
    const store = createStore("table", { client });

    await store.setStatus("v1", VIDEO_STATUS.FAILED, { retryCount: 2 });

    const command = client.send.mock.calls[0][0];
    expect(command.input.Item).toMatchObject({
      videoId: "v1",
      status: VIDEO_STATUS.FAILED,
      retryCount: 2,
    });
  });

  it("getStatusで動画の状態を取得する", async () => {
    const client = {
      send: vi.fn().mockResolvedValue({ Item: { videoId: "v1", status: VIDEO_STATUS.PENDING } }),
    };
    const store = createStore("table", { client });

    const item = await store.getStatus("v1");

    expect(item).toEqual({ videoId: "v1", status: VIDEO_STATUS.PENDING });
  });

  it("loadByStatusでページネーションしながら指定状態の動画を読み込む", async () => {
    const client = {
      send: vi
        .fn()
        .mockResolvedValueOnce({
          Items: [{ videoId: "v1", status: VIDEO_STATUS.PENDING }],
          LastEvaluatedKey: { videoId: "v1" },
        })
        .mockResolvedValueOnce({ Items: [{ videoId: "v2", status: VIDEO_STATUS.PENDING }] }),
    };
    const store = createStore("table", { client });

    const items = await store.loadByStatus(VIDEO_STATUS.PENDING);

    expect(items.map((i) => i.videoId)).toEqual(["v1", "v2"]);
    expect(client.send).toHaveBeenCalledTimes(2);
  });
});
