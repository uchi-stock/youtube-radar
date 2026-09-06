import { describe, expect, it, vi, beforeEach } from "vitest";

const loadAllChannels = vi.fn();
const runDiscovery = vi.fn();

vi.mock("../src/lib/channelsStore.js", () => ({
  createChannelsStore: vi.fn(() => ({ loadAllChannels })),
}));
vi.mock("../src/lib/dynamoStore.js", () => ({
  createStore: vi.fn(() => ({})),
}));
vi.mock("../src/discovery.js", () => ({
  runDiscovery,
}));

describe("lambda handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("DynamoDBのチャンネル一覧を読み込み、新着検知結果の件数を返す", async () => {
    loadAllChannels.mockResolvedValue([{ channelId: "c1", name: "チャンネルA", enabled: true }]);
    runDiscovery.mockResolvedValue([{ videoId: "v1", status: "pending" }]);

    const { handler } = await import("../src/lambda.js");
    const result = await handler();

    expect(loadAllChannels).toHaveBeenCalledTimes(1);
    expect(runDiscovery).toHaveBeenCalledWith(
      expect.objectContaining({ channels: [{ channelId: "c1", name: "チャンネルA", enabled: true }] }),
    );
    expect(result).toEqual({ pending: 1 });
  });
});
