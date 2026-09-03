import { describe, expect, it, vi } from "vitest";
import { fetchTranscript } from "../src/lib/transcript.js";

describe("fetchTranscript", () => {
  it("timedtext XMLからテキストを抽出して結合する", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => '<text start="0">Hello &amp; World</text><text start="1">こんにちは</text>',
    });

    const transcript = await fetchTranscript("v1", { fetchImpl });

    expect(transcript).toBe("Hello & World こんにちは");
  });

  it("字幕が存在しない場合はnullを返す", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: true, text: async () => "" });

    const transcript = await fetchTranscript("v1", { fetchImpl });

    expect(transcript).toBeNull();
  });

  it("リクエストが失敗した場合はnullを返す", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, text: async () => "" });

    const transcript = await fetchTranscript("v1", { fetchImpl });

    expect(transcript).toBeNull();
  });
});
