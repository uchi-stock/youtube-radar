// 自宅Raspberry Pi用スクリプトの本体ロジック。字幕取得はヘッドレスブラウザ（Playwright）を
// 用いて実際のブラウザとして振る舞う（Issue #118）。ブラウザの起動・終了自体は
// fetch-transcripts.jsが担い、本ファイルはnewPage（ブラウザコンテキストからページを
// 生成する関数）を外部から注入してもらう形にすることで、ユニットテストではモックした
// pageオブジェクトのみで実ブラウザ無しに検証できるようにしている。

// 優先順位: 日本語の手動字幕 > 日本語の自動生成字幕 > それ以外の最初のトラック。
function selectTrack(tracks, lang) {
  if (tracks.length === 0) {
    return null;
  }
  const manual = tracks.find((t) => t.langCode === lang && !t.kind);
  if (manual) {
    return manual;
  }
  const asr = tracks.find((t) => t.langCode === lang && t.kind === "asr");
  if (asr) {
    return asr;
  }
  return tracks[0];
}

function decodeXmlText(text) {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#39;/g, "'")
    .replace(/&quot;/g, '"')
    .trim();
}

// ページ内のwindow.ytInitialPlayerResponseから字幕トラック一覧を取り出す。ブラウザの
// 実行コンテキスト内（page.evaluate）で読むため、サーバーサイドの素朴なfetchでは通らない
// YouTube側のCookieセッション・bot対策を経由した状態でアクセスできる。
async function fetchTranscript(videoId, { lang = "ja", newPage }) {
  const page = await newPage();
  try {
    const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
    const response = await page.goto(watchUrl, { waitUntil: "domcontentloaded" });
    if (response && !response.ok()) {
      return {
        status: "ERROR",
        detail: `動画ページの取得に失敗しました: HTTP ${response.status()}`,
        httpStatus: response.status(),
      };
    }

    const rawTracks = await page.evaluate(() => {
      const captions = window.ytInitialPlayerResponse?.captions;
      return captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
    });
    const tracks = rawTracks
      .filter((t) => typeof t.baseUrl === "string" && typeof t.languageCode === "string")
      .map((t) => ({ langCode: t.languageCode, kind: t.kind ?? null, baseUrl: t.baseUrl }));
    const track = selectTrack(tracks, lang);
    if (!track) {
      return { status: "NOT_FOUND" };
    }

    const body = await page.evaluate(async (url) => {
      const res = await fetch(url);
      return { ok: res.ok, status: res.status, text: await res.text() };
    }, track.baseUrl);
    if (!body.ok) {
      return { status: "ERROR", detail: `字幕本文の取得に失敗しました: HTTP ${body.status}`, httpStatus: body.status };
    }
    if (!body.text.includes("<text")) {
      return { status: "NOT_FOUND" };
    }
    const transcript = [...body.text.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)]
      .map(([, text]) => decodeXmlText(text))
      .join(" ")
      .trim();
    return transcript.length > 0 ? { status: "OK", transcript } : { status: "NOT_FOUND" };
  } finally {
    await page.close();
  }
}

async function fetchPendingVideos({ apiBaseUrl, apiKey, fetchImpl = fetch }) {
  const res = await fetchImpl(`${apiBaseUrl}/pending`, { headers: { "x-api-key": apiKey } });
  if (!res.ok) {
    throw new Error(`未処理動画一覧の取得に失敗しました: HTTP ${res.status}`);
  }
  const { videos } = await res.json();
  return videos;
}

async function postResult(videoId, result, { apiBaseUrl, apiKey, fetchImpl = fetch }) {
  const body = result.status === "OK" ? { videoId, transcript: result.transcript } : { videoId, status: "NOT_FOUND" };
  const res = await fetchImpl(`${apiBaseUrl}/transcripts`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": apiKey },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    throw new Error(`結果の送信に失敗しました: HTTP ${res.status}`);
  }
  return res.json();
}

const defaultSleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// 未処理動画一覧を取得し、1件ずつ字幕取得・結果送信を行う。1件の失敗が他の動画の
// 処理を止めないよう、例外はログに残すのみで処理を継続する（該当動画は次回のポーリングに委ねる）。
// 動画ごとにdelayMsだけ間隔を空けてYouTubeへリクエストする（Issue #113）。
// HTTP 429（レート制限）は特定の動画固有の問題ではなくIP単位の一時的な制限であり、そのまま
// 残りの動画へリクエストを続けても同様に失敗するだけでなく制限を長引かせる恐れがあるため、
// 429を検知した時点で残りの動画の処理を打ち切る（未処理のまま次回のポーリングに委ねる）。
async function run({
  apiBaseUrl,
  apiKey,
  fetchImpl = fetch,
  newPage,
  logger = console,
  delayMs = Number(process.env.PI_REQUEST_DELAY_MS) || 3000,
  sleepImpl = defaultSleep,
}) {
  const videos = await fetchPendingVideos({ apiBaseUrl, apiKey, fetchImpl });
  logger.log(`未処理動画${videos.length}件を取得しました`);

  const results = [];
  for (const [index, video] of videos.entries()) {
    if (index > 0) {
      await sleepImpl(delayMs);
    }
    try {
      const result = await fetchTranscript(video.videoId, { newPage });
      if (result.status === "ERROR") {
        logger.warn(`[${video.videoId}] ${result.detail}。今回は送信せず次回に持ち越します`);
        results.push({ videoId: video.videoId, status: "skipped" });
        if (result.httpStatus === 429) {
          logger.warn("レート制限（HTTP 429）を検知したため、残りの動画の処理は今回中断します");
          break;
        }
        continue;
      }
      const submitted = await postResult(video.videoId, result, { apiBaseUrl, apiKey, fetchImpl });
      logger.log(`[${video.videoId}] ${submitted.status}`);
      results.push({ videoId: video.videoId, status: submitted.status });
    } catch (error) {
      logger.error(`[${video.videoId}] 処理中に例外が発生しました: ${error.message}。今回は送信せず次回に持ち越します`);
      results.push({ videoId: video.videoId, status: "skipped", error: error.message });
    }
  }
  return results;
}

module.exports = {
  selectTrack,
  decodeXmlText,
  fetchTranscript,
  fetchPendingVideos,
  postResult,
  run,
};
