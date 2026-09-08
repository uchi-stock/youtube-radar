// LLMへの入力サイズを制御するため、文字起こしをこの文字数までに切り詰める。
// チャンク分割・要約統合（Phase 2以降）は現時点では未実装。
const MAX_TRANSCRIPT_CHARS = 12000;

const SYSTEM_PROMPT = `あなたはYouTube動画の文字起こしを要約するアシスタントです。
以下のJSON形式のみで出力してください（説明文・コードブロック記法は不要）。
{"summary": ["1行目", "2行目", "3行目"], "importance": 1-5の整数, "recommendation": 1-5の整数, "tags": ["タグ1", "タグ2"]}
- summary: 動画内容の3行要約
- importance: 情報としての重要度（5段階、5が最重要）
- recommendation: ユーザーが実際に動画を視聴する価値（5段階、5が最も推奨）
- tags: 動画のジャンル・トピックを表す短い名詞句のタグを1〜3個。他の動画とも比較しやすいよう、一般的で簡潔な表現（例:「ゲーム実況」「料理」「ニュース解説」）を使い、同じ意味のタグは常に同じ表記に統一すること`;

const GEMINI_MODEL = "gemini-2.5-flash";

export async function summarizeTranscript(title, description, transcript, apiKey, { fetchImpl = fetch } = {}) {
  const truncated = transcript.slice(0, MAX_TRANSCRIPT_CHARS);
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const res = await fetchImpl(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      contents: [
        { parts: [{ text: `動画タイトル: ${title}\n\n概要欄:\n${description || "(なし)"}\n\n文字起こし:\n${truncated}` }] },
      ],
      generationConfig: { responseMimeType: "application/json" },
    }),
  });
  if (!res.ok) {
    throw new Error(`LLM summarize failed: ${res.status}`);
  }
  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
  const parsed = JSON.parse(text);
  return {
    summary: parsed.summary,
    importance: parsed.importance,
    recommendation: parsed.recommendation,
    tags: parsed.tags ?? [],
  };
}
