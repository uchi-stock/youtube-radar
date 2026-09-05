import { describe, expect, it, vi } from "vitest";
import { fetchTranscript } from "../src/lib/transcript.js";

function textResponse(body, { ok = true, status = 200, headers = {} } = {}) {
  return {
    ok,
    status,
    headers: { get: (name) => headers[name.toLowerCase()] ?? null },
    text: async () => body,
  };
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

    const result = await fetchTranscript("v1", { fetchImpl });

    expect(result).toEqual({ status: "OK", transcript: "Hello & World こんにちは" });
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

    const result = await fetchTranscript("v1", { fetchImpl });

    expect(result).toEqual({ status: "OK", transcript: "自動生成字幕" });
    const [textUrl] = fetchImpl.mock.calls[1];
    expect(textUrl).toContain("lang=ja");
    expect(textUrl).toContain("kind=asr");
  });

  it("日本語トラックが無い場合は一覧の最初のトラックにフォールバックする", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(textResponse('<transcript_list><track lang_code="en"/></transcript_list>'))
      .mockResolvedValueOnce(textResponse('<text start="0">English captions</text>'));

    const result = await fetchTranscript("v1", { fetchImpl });

    expect(result).toEqual({ status: "OK", transcript: "English captions" });
    const [textUrl] = fetchImpl.mock.calls[1];
    expect(textUrl).toContain("lang=en");
  });

  it("字幕トラックが1つも無い場合はNOT_FOUNDを返す", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(textResponse("<transcript_list></transcript_list>"));

    const result = await fetchTranscript("v1", { fetchImpl });

    expect(result).toEqual({ status: "TRANSCRIPT_NOT_FOUND", transcript: null });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });

  it("トラック一覧の取得がHTTP 429で失敗した場合はACCESS_LIMITEDを返し詳細をログに出す（リトライ上限0）", async () => {
    const logger = { warn: vi.fn() };
    const fetchImpl = vi.fn().mockResolvedValue(
      textResponse("rate limited", {
        ok: false,
        status: 429,
        headers: { "retry-after": "12", "content-type": "text/plain" },
      }),
    );

    const result = await fetchTranscript("v1", {
      fetchImpl,
      logger,
      retry: { maxRetries: 0 },
    });

    expect(result).toEqual({ status: "TRANSCRIPT_ACCESS_LIMITED", transcript: null });
    expect(fetchImpl).toHaveBeenCalledTimes(1);
    expect(logger.warn).toHaveBeenCalledTimes(1);
    const [message] = logger.warn.mock.calls[0];
    expect(message).toContain("429");
    expect(message).toContain("Retry-After: 12");
    expect(message).toContain("Content-Type: text/plain");
    expect(message).toContain("host: www.youtube.com");
    expect(message).not.toMatch(/api[_-]?key/i);
  });

  it("トラック一覧の取得が429以外のエラーで失敗した場合はERRORを返す", async () => {
    const fetchImpl = vi.fn().mockResolvedValue(textResponse("", { ok: false, status: 500 }));

    const result = await fetchTranscript("v1", { fetchImpl });

    expect(result).toEqual({ status: "TRANSCRIPT_ERROR", transcript: null });
  });

  it("本文取得がHTTP 429で失敗した場合はACCESS_LIMITEDを返す（リトライ上限0）", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(textResponse('<transcript_list><track lang_code="ja"/></transcript_list>'))
      .mockResolvedValueOnce(textResponse("", { ok: false, status: 429 }));

    const result = await fetchTranscript("v1", { fetchImpl, retry: { maxRetries: 0 } });

    expect(result).toEqual({ status: "TRANSCRIPT_ACCESS_LIMITED", transcript: null });
  });

  it("本文取得が429以外のエラーで失敗した場合はERRORを返す", async () => {
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(textResponse('<transcript_list><track lang_code="ja"/></transcript_list>'))
      .mockResolvedValueOnce(textResponse("", { ok: false, status: 500 }));

    const result = await fetchTranscript("v1", { fetchImpl });

    expect(result).toEqual({ status: "TRANSCRIPT_ERROR", transcript: null });
  });

  it("429が数回続いた後に成功すればリトライして取得できる（実時間は待たない）", async () => {
    const sleepCalls = [];
    const sleep = vi.fn(async (ms) => {
      sleepCalls.push(ms);
    });
    const fetchImpl = vi
      .fn()
      .mockResolvedValueOnce(
        textResponse("", { ok: false, status: 429, headers: { "retry-after": "1" } }),
      )
      .mockResolvedValueOnce(textResponse('<transcript_list><track lang_code="ja"/></transcript_list>'))
      .mockResolvedValueOnce(textResponse('<text start="0">リトライ後に成功</text>'));

    const result = await fetchTranscript("v1", {
      fetchImpl,
      retry: { maxRetries: 2, sleep },
    });

    expect(result).toEqual({ status: "OK", transcript: "リトライ後に成功" });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(sleepCalls).toEqual([1000]);
  });

  it("429がリトライ上限まで続いた場合は無制限にリトライせずACCESS_LIMITEDで打ち切る", async () => {
    const sleep = vi.fn(async () => {});
    const fetchImpl = vi.fn().mockResolvedValue(textResponse("", { ok: false, status: 429 }));

    const result = await fetchTranscript("v1", {
      fetchImpl,
      retry: { maxRetries: 3, baseDelayMs: 10, sleep },
    });

    expect(result).toEqual({ status: "TRANSCRIPT_ACCESS_LIMITED", transcript: null });
    expect(fetchImpl).toHaveBeenCalledTimes(4);
    expect(sleep).toHaveBeenCalledTimes(3);
  });
});
