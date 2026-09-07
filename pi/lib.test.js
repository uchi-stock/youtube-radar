const test = require("node:test");
const assert = require("node:assert/strict");
const { selectTrack, fetchTranscript, fetchPendingVideos, postResult, run } = require("./lib.js");

function textResponse(body, { ok = true, status = 200 } = {}) {
  return { ok, status, text: async () => body, json: async () => JSON.parse(body) };
}

// fetchTranscriptが呼ぶpageの2回のevaluate呼び出し（1回目: captionTracks取得、
// 2回目: 字幕本文のfetch）を、渡された引数の有無で判別してモックする。
function mockPage({ gotoStatus = 200, tracks = [], body = { ok: true, status: 200, text: "" }, closes } = {}) {
  return {
    goto: async () => ({ ok: () => gotoStatus < 400, status: () => gotoStatus }),
    evaluate: async (_fn, arg) => (arg === undefined ? tracks : body),
    close: async () => {
      if (closes) {
        closes.push(true);
      }
    },
  };
}

test("fetchTranscript: 日本語字幕があれば取得できる", async () => {
  const closes = [];
  const newPage = async () =>
    mockPage({
      tracks: [{ baseUrl: "https://example.com/ja", languageCode: "ja" }],
      body: { ok: true, status: 200, text: '<text start="0">こんにちは</text>' },
      closes,
    });

  const result = await fetchTranscript("v1", { newPage });

  assert.deepEqual(result, { status: "OK", transcript: "こんにちは" });
  assert.equal(closes.length, 1);
});

test("fetchTranscript: 字幕トラックが無い場合はNOT_FOUND", async () => {
  const newPage = async () => mockPage({ tracks: [] });

  const result = await fetchTranscript("v1", { newPage });

  assert.deepEqual(result, { status: "NOT_FOUND" });
});

test("fetchTranscript: 動画ページの取得がHTTPエラーの場合はERROR", async () => {
  const newPage = async () => mockPage({ gotoStatus: 429 });

  const result = await fetchTranscript("v1", { newPage });

  assert.equal(result.status, "ERROR");
  assert.equal(result.httpStatus, 429);
});

test("fetchTranscript: baseUrl・languageCodeが無いトラックは除外する", async () => {
  const newPage = async () =>
    mockPage({ tracks: [{ languageCode: "ja" }, { baseUrl: "https://example.com/ja", languageCode: "ja" }] });

  const result = await fetchTranscript("v1", { newPage });

  assert.equal(result.status, "NOT_FOUND");
});

test("fetchTranscript: 日本語の手動字幕が無い場合は自動生成字幕（asr）を選ぶ", async () => {
  const newPage = async () =>
    mockPage({
      tracks: [{ baseUrl: "https://example.com/asr", languageCode: "ja", kind: "asr" }],
      body: { ok: true, status: 200, text: '<text start="0">自動生成字幕</text>' },
    });

  const result = await fetchTranscript("v1", { newPage });

  assert.deepEqual(result, { status: "OK", transcript: "自動生成字幕" });
});

test("fetchTranscript: 対象言語のトラックが無い場合は最初のトラックにフォールバックする", async () => {
  const newPage = async () =>
    mockPage({
      tracks: [{ baseUrl: "https://example.com/en", languageCode: "en" }],
      body: { ok: true, status: 200, text: '<text start="0">English</text>' },
    });

  const result = await fetchTranscript("v1", { lang: "ja", newPage });

  assert.deepEqual(result, { status: "OK", transcript: "English" });
});

test("fetchTranscript: 字幕本文の取得がHTTPエラーの場合はERROR", async () => {
  const newPage = async () =>
    mockPage({
      tracks: [{ baseUrl: "https://example.com/ja", languageCode: "ja" }],
      body: { ok: false, status: 500, text: "" },
    });

  const result = await fetchTranscript("v1", { newPage });

  assert.equal(result.status, "ERROR");
  assert.equal(result.httpStatus, 500);
});

test("fetchTranscript: 字幕本文が空の場合はNOT_FOUND", async () => {
  const newPage = async () =>
    mockPage({
      tracks: [{ baseUrl: "https://example.com/ja", languageCode: "ja" }],
      body: { ok: true, status: 200, text: "<transcript></transcript>" },
    });

  const result = await fetchTranscript("v1", { newPage });

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
    if (url.endsWith("/transcripts")) {
      return textResponse(JSON.stringify({ videoId: "v1", status: "reported" }));
    }
    throw new Error(`unexpected url: ${url}`);
  };
  const newPage = async () =>
    mockPage({
      tracks: [{ baseUrl: "https://example.com/ja", languageCode: "ja" }],
      body: { ok: true, status: 200, text: '<text start="0">本文</text>' },
    });
  const logger = { log: () => {}, warn: () => {}, error: () => {} };

  const results = await run({ apiBaseUrl: "https://api.example.com", apiKey: "secret", fetchImpl, newPage, logger });

  assert.deepEqual(results, [{ videoId: "v1", status: "reported" }]);
  const pendingCall = calls.find((c) => c.url.endsWith("/pending"));
  assert.equal(pendingCall.init.headers["x-api-key"], "secret");
});

test("run: 1件の失敗が他の動画の処理を止めない", async () => {
  const fetchImpl = async (url) => {
    if (url.endsWith("/pending")) {
      return textResponse(JSON.stringify({ videos: [{ videoId: "v1" }, { videoId: "v2" }] }));
    }
    if (url.endsWith("/transcripts")) {
      return textResponse(JSON.stringify({ videoId: "v2", status: "not_found" }));
    }
    throw new Error(`unexpected url: ${url}`);
  };
  let callCount = 0;
  const newPage = async () => {
    callCount += 1;
    if (callCount === 1) {
      throw new Error("network error");
    }
    return mockPage({ tracks: [] });
  };
  const logger = { log: () => {}, warn: () => {}, error: () => {} };

  const results = await run({
    apiBaseUrl: "https://api.example.com",
    apiKey: "secret",
    fetchImpl,
    newPage,
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
    if (url.endsWith("/transcripts")) {
      return textResponse(JSON.stringify({ videoId: "x", status: "not_found" }));
    }
    throw new Error(`unexpected url: ${url}`);
  };
  const newPage = async () => mockPage({ tracks: [] });
  const logger = { log: () => {}, warn: () => {}, error: () => {} };
  const sleepCalls = [];
  const sleepImpl = async (ms) => {
    sleepCalls.push(ms);
  };

  await run({ apiBaseUrl: "https://api.example.com", apiKey: "secret", fetchImpl, newPage, logger, delayMs: 5000, sleepImpl });

  assert.deepEqual(sleepCalls, [5000]);
});

test("run: 429を検知した場合は残りの動画の処理を打ち切る", async () => {
  const pageCalls = [];
  const fetchImpl = async (url) => {
    if (url.endsWith("/pending")) {
      return textResponse(JSON.stringify({ videos: [{ videoId: "v1" }, { videoId: "v2" }] }));
    }
    throw new Error(`unexpected url: ${url}`);
  };
  const newPage = async () => {
    pageCalls.push(1);
    return mockPage({ gotoStatus: 429 });
  };
  const warnings = [];
  const logger = { log: () => {}, warn: (msg) => warnings.push(msg), error: () => {} };

  const results = await run({
    apiBaseUrl: "https://api.example.com",
    apiKey: "secret",
    fetchImpl,
    newPage,
    logger,
    sleepImpl: async () => {},
  });

  assert.deepEqual(results, [{ videoId: "v1", status: "skipped" }]);
  assert.equal(pageCalls.length, 1, "v2用のページが生成されていないこと");
  assert.equal(warnings.length, 2);
});

test("run: 字幕取得がERRORの場合は送信せずskippedとして次回に持ち越す", async () => {
  const posted = [];
  const fetchImpl = async (url, init) => {
    if (url.endsWith("/pending")) {
      return textResponse(JSON.stringify({ videos: [{ videoId: "v1" }] }));
    }
    if (url.endsWith("/transcripts")) {
      posted.push({ url, init });
      return textResponse(JSON.stringify({ videoId: "v1", status: "reported" }));
    }
    throw new Error(`unexpected url: ${url}`);
  };
  const newPage = async () => mockPage({ gotoStatus: 500 });
  const warnings = [];
  const logger = { log: () => {}, warn: (msg) => warnings.push(msg), error: () => {} };

  const results = await run({ apiBaseUrl: "https://api.example.com", apiKey: "secret", fetchImpl, newPage, logger });

  assert.deepEqual(results, [{ videoId: "v1", status: "skipped" }]);
  assert.equal(posted.length, 0);
  assert.equal(warnings.length, 1);
});
