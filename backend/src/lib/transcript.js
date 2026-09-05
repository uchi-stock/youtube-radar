// YouTubeの字幕トラック一覧・字幕本文（自動生成字幕含む）は公式Data APIでは取得できないため、
// 字幕プレイヤー向けの非公式timedtextエンドポイントを利用する。字幕が存在しない動画・
// 取得に失敗した動画はnullを返し、呼び出し側で「文字起こしなし」として扱う。

import { fetchWithRetry } from "./retry.js";

// fetchTranscriptの失敗理由。呼び出し側（pipeline.js）はACCESS_LIMITEDを
// 「字幕が存在しない（NOT_FOUND）」と区別して扱う（アクセス制限による一時的な取得不可のため）。
export const TRANSCRIPT_NOT_FOUND = "TRANSCRIPT_NOT_FOUND";
export const TRANSCRIPT_ACCESS_LIMITED = "TRANSCRIPT_ACCESS_LIMITED";
export const TRANSCRIPT_ERROR = "TRANSCRIPT_ERROR";

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

// 動画ごとに実際に存在する字幕トラック（言語・手動字幕か自動生成字幕か）でなければ
// timedtextエンドポイントは空レスポンスを返すため、まず一覧から選ぶ。
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

// HTTPステータスのみで一時的なアクセス制限（429）とそれ以外の失敗を区別する。
// APIキー・Cookie・Authorization等は非公式エンドポイントへのリクエストに含めていないため、
// レスポンス内容をそのままログに出しても秘密情報が漏れることはない。
function describeFailure(videoId, url, res, bodyText, timing) {
  const { startedAt, finishedAt } = timing;
  const detail = [
    `HTTP ${res.status}`,
    `host: ${new URL(url).host}`,
    `Retry-After: ${res.headers?.get?.("retry-after") ?? "(なし)"}`,
    `Content-Type: ${res.headers?.get?.("content-type") ?? "(なし)"}`,
    `開始: ${startedAt.toISOString()}`,
    `終了: ${finishedAt.toISOString()}`,
    `本文冒頭200文字: ${JSON.stringify((bodyText ?? "").slice(0, 200))}`,
  ].join(", ");
  return `[${videoId}] ${detail}`;
}

async function timedFetch(fetchImpl, url) {
  const startedAt = new Date();
  const res = await fetchImpl(url);
  const finishedAt = new Date();
  return { res, timing: { startedAt, finishedAt } };
}

// 429発生時は同一動画内の1リクエストにつき上限回数までバックオフしてリトライする。
// 上限に達してもなお429の場合はACCESS_LIMITEDとして呼び出し元（pipeline.js）に返し、
// それ以上リトライせず次回実行に委ねる（同一Lambda実行内で無制限リトライしない）。
function fetchWithBackoff(fetchImpl, url, { videoId, logger, retry }) {
  return fetchWithRetry(() => timedFetch(fetchImpl, url), {
    ...retry,
    onRetry: ({ attempt, maxRetries, delayMs }) => {
      logger.warn?.(
        `[${videoId}] HTTP 429のためリトライします（${attempt}/${maxRetries}回目、${Math.round(delayMs)}ms待機後に再試行）: ${url}`,
      );
    },
  });
}

export async function fetchTranscript(
  videoId,
  { lang = "ja", fetchImpl = fetch, logger = console, retry = {} } = {},
) {
  const listUrl = `https://www.youtube.com/api/timedtext?type=list&v=${encodeURIComponent(videoId)}`;
  const { res: listRes, timing: listTiming } = await fetchWithBackoff(fetchImpl, listUrl, {
    videoId,
    logger,
    retry,
  });
  if (!listRes.ok) {
    const bodyText = await listRes.text?.().catch(() => "");
    if (listRes.status === 429) {
      logger.warn?.(
        `字幕トラック一覧の取得がアクセス制限（429）で失敗しました: ${describeFailure(videoId, listUrl, listRes, bodyText, listTiming)}`,
      );
      return { status: TRANSCRIPT_ACCESS_LIMITED, transcript: null };
    }
    logger.warn?.(`字幕トラック一覧の取得に失敗しました: ${describeFailure(videoId, listUrl, listRes, bodyText, listTiming)}`);
    return { status: TRANSCRIPT_ERROR, transcript: null };
  }
  const listXml = await listRes.text();
  const track = selectTrack(parseTracks(listXml), lang);
  if (!track) {
    logger.warn?.(
      `[${videoId}] 字幕トラックが見つかりませんでした（HTTP ${listRes.status}, 本文冒頭200文字: ${JSON.stringify(listXml.slice(0, 200))}）`,
    );
    return { status: TRANSCRIPT_NOT_FOUND, transcript: null };
  }

  const params = new URLSearchParams({ v: videoId, lang: track.langCode });
  if (track.kind) {
    params.set("kind", track.kind);
  }
  const textUrl = `https://www.youtube.com/api/timedtext?${params.toString()}`;
  const { res, timing } = await fetchWithBackoff(fetchImpl, textUrl, { videoId, logger, retry });
  if (!res.ok) {
    const bodyText = await res.text?.().catch(() => "");
    if (res.status === 429) {
      logger.warn?.(
        `字幕本文の取得がアクセス制限（429）で失敗しました: ${describeFailure(videoId, textUrl, res, bodyText, timing)}`,
      );
      return { status: TRANSCRIPT_ACCESS_LIMITED, transcript: null };
    }
    logger.warn?.(`字幕本文の取得に失敗しました: ${describeFailure(videoId, textUrl, res, bodyText, timing)}`);
    return { status: TRANSCRIPT_ERROR, transcript: null };
  }
  const xml = await res.text();
  if (!xml.includes("<text")) {
    return { status: TRANSCRIPT_NOT_FOUND, transcript: null };
  }
  const transcript = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)]
    .map(([, body]) => decodeXmlText(body))
    .join(" ")
    .trim();
  if (transcript.length === 0) {
    return { status: TRANSCRIPT_NOT_FOUND, transcript: null };
  }
  return { status: "OK", transcript };
}
