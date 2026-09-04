import { describe, expect, it, vi } from "vitest";
import { fetchTranscript } from "../src/lib/transcript.js";

function textResponse(body, ok = true) {
  return { ok, text: async () => body };
}

describe("fetchTranscript", () => {
  it("日本語の手動字幕トラックがあればそれを選び、本文を結合して返す", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        textResponse(
          '<transcript_list><track lang_code="en"/><track lang_code="ja"/></transcript_list>',
        ),
      )
      .mockResolvedValueOnce(
        textResponse('<text start="0">Hello &amp; World</text><text start="1">こんにちは</text>'),
      );

    const transcript = await fetchTranscript("v1", { fetchImpl });

    expect(transcript).toBe("Hello & World こんにちは");
    const [textUrl] = fetchImpl.mock.calls[1];
    expect(textUrl).toContain("lang=ja");
    expect(textUrl).not.toContain("kind=asr");
  });

  it("日本語の手動字幕が無く自動生成字幕のみの場合はkind=asrで取得する", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        textResponse('<transcript_list><track lang_code="ja" kind="asr"/></transcript_list>'),
      )
      .mockResolvedValueOnce(textResponse('<text start="0">自動生成字幕</text>'));

    const transcript = await fetchTranscript("v1", { fetchImpl });

    expect(transcript).toBe("自動生成字幕");
    const [textUrl] = fetchImpl.mock.calls[1];
    expect(textUrl).toContain("lang=ja");
    expect(textUrl).toContain("kind=asr");
  });

  it("日本語トラックが無い場合は一覧の最初のトラックにフォールバックする", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(textResponse('<transcript_list><track lang_code="en"/></transcript_list>'))
      .mockResolvedValueOnce(textResponse('<text start="0">English captions</text>'));

    const transcript = await fetchTranscript("v1", { fetchImpl });

    expect(transcript).toBe("English captions");
    const [textUrl] = fetchImpl.mock.calls[1];
    expect(textUrl).toContain("lang=en");
  });

  it("字幕トラックが1つも無い場合はnullを返す", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(textResponse("<transcript_list></transcript_list>"));

    const transcript = await fetchTranscript("v1", { fetchImpl });

    expect(transcript).toBeNull();
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("トラック一覧の取得が失敗した場合はnullを返す", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(textResponse("", false));

    const transcript = await fetchTranscript("v1", { fetchImpl });

    expect(transcript).toBeNull();
  });

  it("本文取得が失敗した場合はnullを返す", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(textResponse('<transcript_list><track lang_code="ja"/></transcript_list>'))
      .mockResolvedValueOnce(textResponse("", false));

    const transcript = await fetchTranscript("v1", { fetchImpl });

    expect(transcript).toBeNull();
  });
});
