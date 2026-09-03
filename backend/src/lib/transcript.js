// YouTubeの字幕トラック一覧・字幕本文（自動生成字幕含む）は公式Data APIでは取得できないため、
// 字幕プレイヤー向けの非公式timedtextエンドポイントを利用する。字幕が存在しない動画・
// 取得に失敗した動画はnullを返し、呼び出し側で「文字起こしなし」として扱う。
export async function fetchTranscript(videoId, { lang = "ja", fetchImpl = fetch } = {}) {
  const url = `https://www.youtube.com/api/timedtext?lang=${lang}&v=${encodeURIComponent(videoId)}`;
  const res = await fetchImpl(url);
  if (!res.ok) {
    return null;
  }
  const xml = await res.text();
  if (!xml.includes("<text")) {
    return null;
  }
  const texts = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map(([, body]) =>
    body
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&#39;/g, "'")
      .replace(/&quot;/g, '"')
      .trim(),
  );
  const transcript = texts.join(" ").trim();
  return transcript.length > 0 ? transcript : null;
}
