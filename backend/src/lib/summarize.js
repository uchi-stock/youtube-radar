// LLMへの入力サイズを制御するため、文字起こしをこの文字数までに切り詰める。
// チャンク分割・要約統合（Phase 2以降）は現時点では未実装。
const MAX_TRANSCRIPT_CHARS = 12000;

const SYSTEM_PROMPT = `あなたはYouTube動画の文字起こしを要約するアシスタントです。
以下のJSON形式のみで出力してください（説明文・コードブロック記法は不要）。
{"summary": ["1行目", "2行目", "3行目"], "importance": 1-5の整数, "recommendation": 1-5の整数}
- summary: 動画内容の3行要約
- importance: 情報としての重要度（5段階、5が最重要）
- recommendation: ユーザーが実際に動画を視聴する価値（5段階、5が最も推奨）`;

export async function summarizeTranscript(title, transcript, apiKey, { fetchImpl = fetch } = {}) {
  const truncated = transcript.slice(0, MAX_TRANSCRIPT_CHARS);
  const res = await fetchImpl("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: `動画タイトル: ${title}\n\n文字起こし:\n${truncated}` }],
    }),
  });
  if (!res.ok) {
    throw new Error(`LLM summarize failed: ${res.status}`);
  }
  const data = await res.json();
  const text = data.content?.[0]?.text ?? "";
  const parsed = JSON.parse(text);
  return {
    summary: parsed.summary,
    importance: parsed.importance,
    recommendation: parsed.recommendation,
  };
}
