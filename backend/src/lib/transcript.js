// YouTubeの字幕トラック一覧・字幕本文（自動生成字幕含む）は公式Data APIでは取得できないため、
// 字幕プレイヤー向けの非公式timedtextエンドポイントを利用する。字幕が存在しない動画・
// 取得に失敗した動画はnullを返し、呼び出し側で「文字起こしなし」として扱う。
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

export async function fetchTranscript(videoId, { lang = "ja", fetchImpl = fetch } = {}) {
  const listUrl = `https://www.youtube.com/api/timedtext?type=list&v=${encodeURIComponent(videoId)}`;
  const listRes = await fetchImpl(listUrl);
  if (!listRes.ok) {
    return null;
  }
  const track = selectTrack(parseTracks(await listRes.text()), lang);
  if (!track) {
    return null;
  }

  const params = new URLSearchParams({ v: videoId, lang: track.langCode });
  if (track.kind) {
    params.set("kind", track.kind);
  }
  const res = await fetchImpl(`https://www.youtube.com/api/timedtext?${params.toString()}`);
  if (!res.ok) {
    return null;
  }
  const xml = await res.text();
  if (!xml.includes("<text")) {
    return null;
  }
  const transcript = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)]
    .map(([, body]) => decodeXmlText(body))
    .join(" ")
    .trim();
  return transcript.length > 0 ? transcript : null;
}
