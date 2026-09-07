// 自宅Raspberry Pi用スクリプトの本体ロジック。依存パッケージ無し
// （Node.js 18以降のグローバルfetchのみを使用）で完結させ、Raspberry Pi上でのセットアップを
// 簡素にする。エントリポイントはfetch-transcripts.js。

// 動画再生ページ（/watch）へのリクエストに使うUser-Agent。素朴なリクエストは
// YouTube側で簡略化されたページを返すことがあるため、一般的なブラウザを装う（Issue #113）。
const WATCH_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

// 動画再生ページのHTMLに埋め込まれたytInitialPlayerResponse内の"captionTracks"配列を
// 正規表現で抽出する。ページ全体をJSONとしてパースするのは巨大かつ壊れやすいため、
// 該当する配列部分のみを取り出す（captionTracksの各要素にネストした配列は含まれないため、
// 非貪欲マッチで対応する最初の"]"まで取得すれば配列全体を取り切れる）。
function parseCaptionTracks(html) {
  const match = html.match(/"captionTracks":(\[.*?\])/);
  if (!match) {
    return [];
  }
  let rawTracks;
  try {
    rawTracks = JSON.parse(match[1]);
  } catch {
    return [];
  }
  return rawTracks
    .filter((t) => typeof t.baseUrl === "string" && typeof t.languageCode === "string")
    .map((t) => ({ langCode: t.languageCode, kind: t.kind ?? null, baseUrl: t.baseUrl }));
}

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

async function fetchTranscript(videoId, { lang = "ja", fetchImpl = fetch } = {}) {
  const watchUrl = `https://www.youtube.com/watch?v=${encodeURIComponent(videoId)}`;
  const watchRes = await fetchImpl(watchUrl, {
    headers: { "user-agent": WATCH_USER_AGENT, "accept-language": lang },
  });
  if (!watchRes.ok) {
    return { status: "ERROR", detail: `動画ページの取得に失敗しました: HTTP ${watchRes.status}` };
  }
  const html = await watchRes.text();
  const track = selectTrack(parseCaptionTracks(html), lang);
  if (!track) {
    return { status: "NOT_FOUND" };
  }

  const res = await fetchImpl(track.baseUrl, { headers: { "user-agent": WATCH_USER_AGENT } });
  if (!res.ok) {
    return { status: "ERROR", detail: `字幕本文の取得に失敗しました: HTTP ${res.status}` };
  }
  const xml = await res.text();
  if (!xml.includes("<text")) {
    return { status: "NOT_FOUND" };
  }
  const transcript = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)]
    .map(([, body]) => decodeXmlText(body))
    .join(" ")
    .trim();
  return transcript.length > 0 ? { status: "OK", transcript } : { status: "NOT_FOUND" };
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
// 動画ごとにdelayMsだけ間隔を空けてYouTubeへリクエストする。1回の実行で複数動画を連続
// リクエストするとYouTube側のレート制限（HTTP 429）に掛かることが確認されたため（Issue #113）。
async function run({
  apiBaseUrl,
  apiKey,
  fetchImpl = fetch,
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
      const result = await fetchTranscript(video.videoId, { fetchImpl });
      if (result.status === "ERROR") {
        logger.warn(`[${video.videoId}] ${result.detail}。今回は送信せず次回に持ち越します`);
        results.push({ videoId: video.videoId, status: "skipped" });
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
  parseCaptionTracks,
  selectTrack,
  decodeXmlText,
  fetchTranscript,
  fetchPendingVideos,
  postResult,
  run,
};
