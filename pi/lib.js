// 自宅Raspberry Pi用スクリプトの本体ロジック。依存パッケージ無し
// （Node.js 18以降のグローバルfetchのみを使用）で完結させ、Raspberry Pi上でのセットアップを
// 簡素にする。エントリポイントはfetch-transcripts.js。

function parseTracks(listXml) {
  const tracks = [];
  const trackRegex = /<track\b([^>]*)\/>/g;
  let match;
  while ((match = trackRegex.exec(listXml)) !== null) {
    const attrs = match[1];
    const langMatch = attrs.match(/lang_code="([^"]*)"/);
    if (!langMatch) {
      continue;
    }
    const kindMatch = attrs.match(/kind="([^"]*)"/);
    tracks.push({ langCode: langMatch[1], kind: kindMatch ? kindMatch[1] : null });
  }
  return tracks;
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
  const listUrl = `https://www.youtube.com/api/timedtext?type=list&v=${encodeURIComponent(videoId)}`;
  const listRes = await fetchImpl(listUrl);
  if (!listRes.ok) {
    return { status: "ERROR", detail: `字幕トラック一覧の取得に失敗しました: HTTP ${listRes.status}` };
  }
  const listXml = await listRes.text();
  const track = selectTrack(parseTracks(listXml), lang);
  if (!track) {
    return { status: "NOT_FOUND" };
  }

  const params = new URLSearchParams({ v: videoId, lang: track.langCode });
  if (track.kind) {
    params.set("kind", track.kind);
  }
  const res = await fetchImpl(`https://www.youtube.com/api/timedtext?${params.toString()}`);
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

// 未処理動画一覧を取得し、1件ずつ字幕取得・結果送信を行う。1件の失敗が他の動画の
// 処理を止めないよう、例外はログに残すのみで処理を継続する（該当動画は次回のポーリングに委ねる）。
async function run({ apiBaseUrl, apiKey, fetchImpl = fetch, logger = console }) {
  const videos = await fetchPendingVideos({ apiBaseUrl, apiKey, fetchImpl });
  logger.log(`未処理動画${videos.length}件を取得しました`);

  const results = [];
  for (const video of videos) {
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
  parseTracks,
  selectTrack,
  decodeXmlText,
  fetchTranscript,
  fetchPendingVideos,
  postResult,
  run,
};
