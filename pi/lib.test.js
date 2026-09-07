const test = require("node:test");
const assert = require("node:assert/strict");
const { parseCaptionTracks, selectTrack, fetchTranscript, fetchPendingVideos, postResult, run } = require("./lib.js");

function textResponse(body, { ok = true, status = 200 } = {}) {
  return { ok, status, text: async () => body, json: async () => JSON.parse(body) };
}

function watchPageHtml(captionTracks) {
  return `<html><script>var ytInitialPlayerResponse = {"captions":{"playerCaptionsTracklistRenderer":{"captionTracks":${JSON.stringify(captionTracks)}}}};</script></html>`;
}

test("parseCaptionTracks: captionTracksが無いHTMLでは空配列を返す", () => {
  assert.deepEqual(parseCaptionTracks("<html></html>"), []);
});

test("parseCaptionTracks: 不正なJSONの場合は空配列を返す", () => {
  const html = '<html><script>var x = {"captionTracks":[{"baseUrl":BROKEN}]};</script></html>';
  assert.deepEqual(parseCaptionTracks(html), []);
});

test("parseCaptionTracks: baseUrl・languageCodeが無いトラックは除外する", () => {
  const html = watchPageHtml([{ languageCode: "ja" }, { baseUrl: "https://example.com/a", languageCode: "ja" }]);
  assert.deepEqual(parseCaptionTracks(html), [{ langCode: "ja", kind: null, baseUrl: "https://example.com/a" }]);
});

test("fetchTranscript: 日本語字幕があれば取得できる", async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (calls.length === 1) {
      return textResponse(watchPageHtml([{ baseUrl: "https://example.com/ja", languageCode: "ja" }]));
    }
    return textResponse('<text start="0">こんにちは</text>');
  };

  const result = await fetchTranscript("v1", { fetchImpl });

  assert.deepEqual(result, { status: "OK", transcript: "こんにちは" });
  assert.equal(calls[1], "https://example.com/ja");
});

test("fetchTranscript: 字幕トラックが無い場合はNOT_FOUND", async () => {
  const fetchImpl = async () => textResponse(watchPageHtml([]));

  const result = await fetchTranscript("v1", { fetchImpl });

  assert.deepEqual(result, { status: "NOT_FOUND" });
});

test("fetchTranscript: 動画ページの取得がHTTPエラーの場合はERROR", async () => {
  const fetchImpl = async () => textResponse("", { ok: false, status: 429 });

  const result = await fetchTranscript("v1", { fetchImpl });

  assert.equal(result.status, "ERROR");
});

test("fetchTranscript: 日本語の手動字幕が無い場合は自動生成字幕（asr）を選ぶ", async () => {
  const calls = [];
  const fetchImpl = async (url) => {
    calls.push(url);
    if (calls.length === 1) {
      return textResponse(watchPageHtml([{ baseUrl: "https://example.com/asr", languageCode: "ja", kind: "asr" }]));
    }
    return textResponse('<text start="0">自動生成字幕</text>');
  };

  const result = await fetchTranscript("v1", { fetchImpl });

  assert.deepEqual(result, { status: "OK", transcript: "自動生成字幕" });
  assert.equal(calls[1], "https://example.com/asr");
});

test("fetchTranscript: 対象言語のトラックが無い場合は最初のトラックにフォールバックする", async () => {
  const fetchImpl = async (url) => {
    if (url.startsWith("https://www.youtube.com/watch")) {
      return textResponse(watchPageHtml([{ baseUrl: "https://example.com/en", languageCode: "en" }]));
    }
    return textResponse('<text start="0">English</text>');
  };

  const result = await fetchTranscript("v1", { lang: "ja", fetchImpl });

  assert.deepEqual(result, { status: "OK", transcript: "English" });
});

test("fetchTranscript: 字幕本文の取得がHTTPエラーの場合はERROR", async () => {
  const calls = [];
  const fetchImpl = async () => {
    calls.push(1);
    if (calls.length === 1) {
      return textResponse(watchPageHtml([{ baseUrl: "https://example.com/ja", languageCode: "ja" }]));
    }
    return textResponse("", { ok: false, status: 500 });
  };

  const result = await fetchTranscript("v1", { fetchImpl });

  assert.equal(result.status, "ERROR");
});

test("fetchTranscript: 字幕本文が空の場合はNOT_FOUND", async () => {
  const calls = [];
  const fetchImpl = async () => {
    calls.push(1);
    if (calls.length === 1) {
      return textResponse(watchPageHtml([{ baseUrl: "https://example.com/ja", languageCode: "ja" }]));
    }
    return textResponse("<transcript></transcript>");
  };

  const result = await fetchTranscript("v1", { fetchImpl });

  assert.deepEqual(result, { status: "NOT_FOUND" });
});

test("selectTrack: トラックが空の場合はnullを返す", () => {
  assert.equal(selectTrack([], "ja"), null);
});

test("fetchPendingVideos: HTTPエラーの場合は例外を投げる", async () => {
  const fetchImpl = async () => textResponse("", { ok: false, status: 500 });

  await assert.rejects(
    () => fetchPendingVideos({ apiBaseUrl: "https://api.example.com", apiKey: "secret", fetchImpl }),
    /HTTP 500/,
  );
});

test("postResult: HTTPエラーの場合は例外を投げる", async () => {
  const fetchImpl = async () => textResponse("", { ok: false, status: 500 });

  await assert.rejects(
    () => postResult("v1", { status: "NOT_FOUND" }, { apiBaseUrl: "https://api.example.com", apiKey: "secret", fetchImpl }),
    /HTTP 500/,
  );
});

test("run: 未処理動画を取得し字幕取得結果を送信する", async () => {
  const calls = [];
  const fetchImpl = async (url, init) => {
    calls.push({ url, init });
    if (url.endsWith("/pending")) {
      return textResponse(JSON.stringify({ videos: [{ videoId: "v1" }] }));
    }
    if (url.startsWith("https://www.youtube.com/watch")) {
      return textResponse(watchPageHtml([{ baseUrl: "https://example.com/ja", languageCode: "ja" }]));
    }
    if (url === "https://example.com/ja") {
      return textResponse('<text start="0">本文</text>');
    }
    if (url.endsWith("/transcripts")) {
      return textResponse(JSON.stringify({ videoId: "v1", status: "reported" }));
    }
    throw new Error(`unexpected url: ${url}`);
  };
  const logger = { log: () => {}, warn: () => {}, error: () => {} };

  const results = await run({ apiBaseUrl: "https://api.example.com", apiKey: "secret", fetchImpl, logger });

  assert.deepEqual(results, [{ videoId: "v1", status: "reported" }]);
  const pendingCall = calls.find((c) => c.url.endsWith("/pending"));
  assert.equal(pendingCall.init.headers["x-api-key"], "secret");
});

test("run: 1件の失敗が他の動画の処理を止めない", async () => {
  const fetchImpl = async (url) => {
    if (url.endsWith("/pending")) {
      return textResponse(JSON.stringify({ videos: [{ videoId: "v1" }, { videoId: "v2" }] }));
    }
    if (url.includes("v1")) {
      throw new Error("network error");
    }
    if (url.startsWith("https://www.youtube.com/watch")) {
      return textResponse(watchPageHtml([]));
    }
    if (url.endsWith("/transcripts")) {
      return textResponse(JSON.stringify({ videoId: "v2", status: "not_found" }));
    }
    throw new Error(`unexpected url: ${url}`);
  };
  const logger = { log: () => {}, warn: () => {}, error: () => {} };

  const results = await run({
    apiBaseUrl: "https://api.example.com",
    apiKey: "secret",
    fetchImpl,
    logger,
    sleepImpl: async () => {},
  });

  assert.deepEqual(results, [
    { videoId: "v1", status: "skipped", error: "network error" },
    { videoId: "v2", status: "not_found" },
  ]);
});

test("run: 動画ごとにdelayMsだけ間隔を空ける（1件目の前では待たない）", async () => {
  const fetchImpl = async (url) => {
    if (url.endsWith("/pending")) {
      return textResponse(JSON.stringify({ videos: [{ videoId: "v1" }, { videoId: "v2" }] }));
    }
    if (url.startsWith("https://www.youtube.com/watch")) {
      return textResponse(watchPageHtml([]));
    }
    if (url.endsWith("/transcripts")) {
      return textResponse(JSON.stringify({ videoId: "x", status: "not_found" }));
    }
    throw new Error(`unexpected url: ${url}`);
  };
  const logger = { log: () => {}, warn: () => {}, error: () => {} };
  const sleepCalls = [];
  const sleepImpl = async (ms) => {
    sleepCalls.push(ms);
  };

  await run({ apiBaseUrl: "https://api.example.com", apiKey: "secret", fetchImpl, logger, delayMs: 5000, sleepImpl });

  assert.deepEqual(sleepCalls, [5000]);
});

test("run: 字幕取得がERRORの場合は送信せずskippedとして次回に持ち越す", async () => {
  const posted = [];
  const fetchImpl = async (url, init) => {
    if (url.endsWith("/pending")) {
      return textResponse(JSON.stringify({ videos: [{ videoId: "v1" }] }));
    }
    if (url.startsWith("https://www.youtube.com/watch")) {
      return textResponse("", { ok: false, status: 429 });
    }
    if (url.endsWith("/transcripts")) {
      posted.push({ url, init });
      return textResponse(JSON.stringify({ videoId: "v1", status: "reported" }));
    }
    throw new Error(`unexpected url: ${url}`);
  };
  const warnings = [];
  const logger = { log: () => {}, warn: (msg) => warnings.push(msg), error: () => {} };

  const results = await run({ apiBaseUrl: "https://api.example.com", apiKey: "secret", fetchImpl, logger });

  assert.deepEqual(results, [{ videoId: "v1", status: "skipped" }]);
  assert.equal(posted.length, 0);
  assert.equal(warnings.length, 1);
});
